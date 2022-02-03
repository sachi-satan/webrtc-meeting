terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "4.0.0"
    }
  }

  backend "remote" {
    organization = "Coogic"

    workspaces {
      name = "webrtc-meeting"
    }
  }
}

provider "google" {
  project = "coogic"
  region  = "asia-northeast1"
  zone    = "asia-northeast1-a"
}

# Address

resource "google_compute_global_address" "lb" {
  name = "webrtc-meeting-lb-ip"
}

# VPC

resource "google_compute_network" "vpc" {
  name                    = "webrtc-meeting-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "webrtc-meeting-subnet"
  ip_cidr_range = "10.128.0.0/20"
  region        = "asia-northeast1"
  network       = google_compute_network.vpc.id
}

# GKE

resource "google_container_cluster" "gke" {
  name     = "webrtc-meeting-gke-cluster"
  location = "asia-northeast1"

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  enable_autopilot = true

  vertical_pod_autoscaling {
    enabled = true
  }
}
