# Deployment Guide (Docker)

This application has been containerized for easy and portable deployment using Docker and Nginx.

## Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Quick Start (Windows Production with SSL)

1.  **Generate SSL Certificates:**
    Open the `ssl` folder and run **`generate-ssl.bat`**. This will create `server.key` and `server.crt` (valid for 10 years).
    > [!NOTE]
    > For production with a real domain, replace these files with your official certificates.

2.  **Open `manage.bat`** and select **Option [10]**.
3.  **Local DNS Setup (Required for `itasset.web`):**
    To access the site via `https://itasset.web`, you must map this domain to your local machine:
    - Open **Notepad** as **Administrator**.
    - Open the file: `C:\Windows\System32\drivers\etc\hosts`
    - Add this line at the bottom:
      ```text
      127.0.0.1  itasset.web
      ```
    - Save and close.

4.  **Access the application** at **`https://itasset.web`**.

## New Management Options in `manage.bat`

- **[10] Start DOCKER Production:** Builds and starts the entire stack (Nginx, Backend, MongoDB).
- **[11] Stop DOCKER Production:** Gracefully stops and removes the containers.
- **[12] View DOCKER Logs:** Streams logs from all containers to your terminal.
- **[4] STOP All Processes:** Now also includes stopping Docker containers.

## Production-Grade Features

- **Standard Port 80:** The application now runs on the standard web port (80), so you don't need to specify a port in the URL.
- **Health Checks:** Docker automatically monitors the health of MongoDB and waits for it to be ready before starting the backend.
- **Automatic Restarts:** Containers are configured to restart automatically if they crash or if the Windows server reboots.
- **Log Management:** Logs are capped at 10MB per file with a maximum of 3 files to prevent disk space issues on your Windows server.
- **Nginx Web Server:** A specialized, high-performance Nginx server handles all frontend traffic and securely proxies API requests.

## Key Features of this Setup

- **Portability:** The entire stack runs in isolated containers, ensuring "it works on my machine" translates to "it works everywhere".
- **Nginx Serving:** The frontend is served via a production-optimized Nginx server, which also handles SPA routing and proxies API requests efficiently.
- **Persistence:** MongoDB data is stored in a Docker volume, so it persists even if containers are stopped or removed.
- **Zero Configuration:** Service discovery is handled by Docker Compose (the backend automatically finds the database via the `mongodb` hostname).

## Common Commands

- **Stop the system:** `docker-compose down`
- **View logs:** `docker-compose logs -f`
- **Rebuild after code changes:** `docker-compose up --build -d`

## Accessing the Database

You can access the MongoDB database running in Docker in two ways:

### 1. Using a GUI (Recommended)
You can use **MongoDB Compass** or any other database client on your Windows machine to connect.
- **Connection String:** `mongodb://localhost:27017`
- **Authentication:** Not enabled by default in this basic setup.

### 2. Using the Command Line (mongosh)
To open the MongoDB shell directly inside the container, run this command in your terminal:
```bash
docker exec -it itasset-mongodb mongosh
```
## Accessing from Other Devices on the LAN

To allow other devices (mobiles, laptops) on your network to access `https://itasset.web`:

### 1. Find your Server's IP Address
Run `ipconfig` in your terminal and find your **IPv4 Address** (e.g., `192.168.1.50`).

### 2. Configure Client Devices

#### Method A: Automated Script (Easiest for small networks)
1. Copy the **`setup-client.ps1`** file to the client computer.
2. Right-click it and select **"Run with PowerShell"** (as Administrator).
3. Enter your server's IP when prompted.

#### Method B: Local DNS Server (Professional / Enterprise)
If you have a large number of systems, the best way is to add a **DNS Record** to your local network's DNS server (e.g., Windows Domain Controller, Pi-hole, or Mikrotik/Cisco router):
1. Log in to your DNS management console.
2. Add an **A Record**:
   - **Name:** `itasset.web`
   - **IP Address:** `<YOUR_SERVER_IP>`
3. Once updated, **all devices** on the network will automatically resolve `itasset.web` without any manual configuration.

### 3. Windows Firewall (On the Server)
Ensure your server allows incoming traffic on **Port 80** and **Port 443**.
1. Open "Windows Defender Firewall with Advanced Security".
2. Go to **Inbound Rules** > **New Rule**.
3. Select **Port** > **TCP** > Specific local ports: **80, 443**.
4. Select **Allow the connection**.
#### Method C: Cloudflare Tunnel (Recommended for Speed)
Cloudflare Tunnel is significantly faster than Tailscale Funnel.

1. **Create a Tunnel:**
   - Log in to your [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
   - Go to **Networks** -> **Tunnels**.
   - Create a new tunnel (e.g., `itasset-management`).
   - Select **Docker** as the environment.
   - **Copy the Tunnel Token** provided in the setup command.

2. **Update your `.env`:**
   - Open `.env` in the root directory.
   - Paste your token:
     ```env
     TUNNEL_TOKEN=your_copied_token_here
     ```

3. **Configure Public Hostname:**
   - In the Cloudflare Tunnel settings, go to the **Public Hostname** tab.
   - Add a hostname (e.g., `itasset.yourdomain.com`).
   - Set **Service Type** to `HTTP`.
   - Set **URL** to `frontend:80`.

4. **Start the Stack:**
   - Run `docker-compose up -d`.

### 5. Accessing the System
- **Public URL**: Your Cloudflare Hostname (e.g., `https://itasset.yourdomain.com`)
- **Initial Admin User**: `admin`
- **Initial Password**: `password`
