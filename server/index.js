const express = require('express')
const consola = require('consola')
const { Nuxt, Builder } = require('nuxt')
const app = express()

// Import and Set Nuxt.js options
const config = require('../nuxt.config.js')
config.dev = process.env.NODE_ENV !== 'production'

async function start() {
  // Init Nuxt.js
  const nuxt = new Nuxt(config)

  const { host, port } = nuxt.options.server

  // Build only in dev mode
  if (config.dev) {
    const builder = new Builder(nuxt)
    await builder.build()
  } else {
    await nuxt.ready()
  }

  // Give nuxt middleware to express
  app.use(nuxt.render)

  // Listen the server
  let server = app.listen(port, host)
  socketStart(server)
  console.log('Socket.IO starts')
  consola.ready({
    message: `Server listening on http://${host}:${port}`,
    badge: true
  })
}

function socketStart(server) {
  const io = require('socket.io').listen(server)

  io.on('connection', socket => {
    console.log('id:', socket.id, 'is connected')

    socket.on('enter', function (roomname) {
      socket.join(roomname)
      console.log('id:', socket.id, 'enter room:', roomname)
      setRoomname(roomname)
    })

    function setRoomname(room) {
      socket.roomname = room
    }

    function getRoomname() {
      return socket.roomname
    }

    function emitMessage(type, message) {
      var roomname = getRoomname()
      if (roomname) {
        socket.broadcast.to(roomname).emit(type, message)
      }
      else {
        socket.broadcast.emit(type, message)
      }
    }

    socket.on('message', function (message) {
      message.from = socket.id

      var target = message.sendto
      if (target) {
        console.log('message emit to:', target)
        socket.to(target).emit('message', message)
        return
      }

      emitMessage('message', message)
    })

    socket.on('disconnect', function () {
      console.log('id:', socket.id, 'is disconnected')
      emitMessage('user disconnected', { id: socket.id })
      var roomname = getRoomname()
      if (roomname) {
        socket.leave(roomname)
      }
    })
  })
}

start()
