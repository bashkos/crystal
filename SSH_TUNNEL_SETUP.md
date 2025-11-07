# SSH Tunnel Setup Guide for Database Connection

## What is an SSH Tunnel?

An SSH tunnel creates a secure connection between your local machine and the VPS, allowing you to access the database as if it were running locally.

## Prerequisites

1. **SSH access to your VPS** (username and password, or SSH key)
2. **SSH client** (Windows 10/11 has OpenSSH built-in, or use PuTTY)

## Method 1: Using Windows PowerShell/Command Prompt (Recommended)

### Step 1: Open a new PowerShell/Command Prompt window

Keep this window open - it will run the tunnel.

### Step 2: Run the SSH tunnel command

Replace the placeholders with your actual VPS details:

```powershell
ssh -L 5432:127.0.0.1:5432 username@31.97.34.56
```

**Example:**
```powershell
ssh -L 5432:127.0.0.1:5432 root@31.97.34.56
```

**What this does:**
- `-L 5432:127.0.0.1:5432` = Forward local port 5432 to remote port 5432
- `username@31.97.34.56` = Your VPS username and IP address

### Step 3: Enter your password when prompted

You'll be asked for your VPS password. Enter it to establish the connection.

### Step 4: Keep the terminal open

**IMPORTANT:** Keep this terminal window open while you're working. Closing it will close the tunnel.

### Step 5: Verify the tunnel is working

In another terminal, test the connection:
```powershell
# Test if port 5432 is listening locally
netstat -an | findstr :5432
```

Or try connecting with psql (if installed):
```powershell
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres
```

## Method 2: Using PuTTY (If OpenSSH doesn't work)

### Step 1: Download PuTTY
Download from: https://www.putty.org/

### Step 2: Configure the tunnel in PuTTY

1. Open PuTTY
2. Enter your VPS details:
   - **Host Name:** `31.97.34.56`
   - **Port:** `22`
   - **Connection type:** SSH

3. Go to **Connection > SSH > Tunnels**
4. Add a new forwarded port:
   - **Source port:** `5432`
   - **Destination:** `127.0.0.1:5432`
   - **Local** (radio button selected)
   - Click **Add**

5. Go back to **Session** and save the configuration
6. Click **Open** to connect

### Step 3: Login to your VPS

Enter your username and password when prompted.

## Method 3: Using SSH Key (More Secure)

If you have an SSH key set up:

```powershell
ssh -i path\to\your\private\key -L 5432:127.0.0.1:5432 username@31.97.34.56
```

## Troubleshooting

### "Connection refused" error
- Check if SSH is enabled on your VPS
- Verify the IP address is correct
- Check if port 22 (SSH) is open in your VPS firewall

### "Permission denied" error
- Verify your username is correct
- Check your password
- If using SSH key, ensure the key has correct permissions

### "Port already in use" error
- Another application might be using port 5432
- Change the local port: `ssh -L 5433:127.0.0.1:5432 username@31.97.34.56`
- Then update `.env.local` to use port 5433

### Can't connect to database after tunnel is set up
- Verify the tunnel is still running (check the SSH terminal)
- Make sure PostgreSQL is running on the VPS
- Check if the database password is correct

## Quick Start Script

Create a file `start-tunnel.ps1`:

```powershell
# SSH Tunnel Startup Script
$VPS_USER = "your-username"
$VPS_IP = "31.97.34.56"
$LOCAL_PORT = 5432
$REMOTE_PORT = 5432

Write-Host "Starting SSH tunnel to $VPS_IP..." -ForegroundColor Green
Write-Host "Local port $LOCAL_PORT -> Remote port $REMOTE_PORT" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the tunnel" -ForegroundColor Yellow
Write-Host ""

ssh -L ${LOCAL_PORT}:127.0.0.1:${REMOTE_PORT} ${VPS_USER}@${VPS_IP}
```

Run it with:
```powershell
.\start-tunnel.ps1
```

## After Tunnel is Set Up

1. **Keep the SSH tunnel terminal open**
2. **Your `.env.local` should have:**
   ```
   DATABASE_URL="postgresql://postgres:R1at4ttVR065QtoYX7xFHaXX0vbJI7B0@127.0.0.1:5432/postgres?sslmode=prefer"
   ```
3. **Run your Next.js app** in a different terminal:
   ```powershell
   cd crystal
   npm run dev
   ```
4. **Test the database connection:**
   ```powershell
   npm run db:push
   ```

## Security Notes

- SSH tunnels are encrypted and secure
- The database is not exposed to the internet
- Only your local machine can access the database through the tunnel
- Always use strong passwords for your VPS

## Alternative: Expose Database Port (NOT Recommended for Production)

If you can't use SSH tunnel, you can expose the database port directly (less secure):

1. Open port 5432 in your VPS firewall
2. Update `.env.local`:
   ```
   DATABASE_URL="postgresql://postgres:R1at4ttVR065QtoYX7xFHaXX0vbJI7B0@31.97.34.56:5432/postgres?sslmode=require"
   ```

**Warning:** This exposes your database to the internet. Only do this in development and use a strong password.

