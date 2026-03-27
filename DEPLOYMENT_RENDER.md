# Render.com Deployment Guide

This guide explains how to deploy the GEM Hospital IT Asset Management system to the cloud using Render and MongoDB Atlas.

## 1. Setup MongoDB Atlas (Database)

Render does not host MongoDB directly. You must use a managed provider like MongoDB Atlas.

1.  **Create Account**: Sign up at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas/register).
2.  **Create Cluster**: Create a new "Shared" cluster (Free Tier).
3.  **Database Access**: Create a user with a username and password (e.g., `dbadmin`). **Save these credentials.**
4.  **Network Access**: Add IP address `0.0.0.0/0` (Allow access from anywhere, required for Render).
5.  **Get Connection String**: 
    - Click **Connect** -> **Drivers**.
    - Copy the string: `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/gem_itasset`.
    - Replace `<password>` with your database user password.

## 2. Deploy to Render

1.  **Push to GitHub**: Ensure your code is in a GitHub or GitLab repository.
2.  **Connect to Render**:
    - Log in to [dashboard.render.com](https://dashboard.render.com/).
    - Click **New +** -> **Blueprint**.
    - Connect your GitHub repository.
3.  **Configure Blueprint**:
    - Render will detect the `render.yaml` file.
    - Click **Approve**.
4.  **Set Environment Variables**:
    - During the setup, Render will ask for `MONGODB_URI`.
    - Paste your **MongoDB Atlas connection string**.
    - Ensure `FRONTEND_URL` points to your Render frontend URL (e.g., `https://it-asset-frontend.onrender.com`).

## 3. Post-Deployment

1.  **Verify Backend**: Visit `https://it-asset-backend.onrender.com/api/health`. It should return `{"status":"ok"}`.
2.  **Verify Frontend**: Visit `https://it-asset-frontend.onrender.com`.
3.  **Initial Login**: 
    - Use **Username**: `admin`
    - Use **Password**: `password`
    - *(Note: You may need to run the seeding process if this is a fresh database)*.

## Troubleshooting

- **CORS Errors**: Ensure the backend's `FRONTEND_URL` environment variable matches the exact URL of your frontend.
- **Connection Timeout**: Ensure you added `0.0.0.0/0` to the MongoDB Atlas IP Whitelist.
