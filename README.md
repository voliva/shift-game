# Shift Game

A small browser sailing-race game. Sail upwind through gates, react to wind shifts, and race locally against an AI or with other players online.

It uses Canvas 2D for the field and boats, Svelte for the interface, and a tiny HTTP/WebSocket server for rooms and online races.

## Features

- Local endless racing against a simple AI
- Wind shifts and gradual boat turning while tacking
- Gate/layline course, beaming recovery, trails, ranking, and minimap
- English, Spanish, and Catalan UI
- Public and password-protected rooms
- WebSocket multiplayer with synchronized starts, wind shifts, and boat state

## Run locally

Install dependencies, then start the client and server in separate terminals:

```bash
pnpm install
pnpm dev
pnpm server
```

The Vite client defaults to `http://localhost:5173`; the room server defaults to `http://localhost:8787`.

## Use a remote room server

Set `VITE_SERVER_URL` when building or running the client:

```bash
VITE_SERVER_URL=https://your-server.example pnpm dev
```

In PowerShell:

```powershell
$env:VITE_SERVER_URL = 'https://your-server.example'
pnpm dev
```

Without it, the client uses `http://localhost:8787`.

## Build

```bash
pnpm build
```

## A candid note on the code

This project originally was an Android-native game I built more than 12 years ago, which featured playing against an AI, or with a local network through bluetooth or WiFi. This is the port of that game, replacing the local networking for online rooms.

This project was built in a strongly AI-assisted, "vibe coded" way: the human direction focused on game design, mechanics, UX, and feedback, while an agent produced much of the implementation. There was also hands-on human refactoring and corrections along the way, but for the most part it's vibe coded.

So I do not feel particularly proud of every architectural decision or every line of code. It is an evolving prototype, not a polished reference implementation. But it works, it is playable, and it has been a useful way to play the game again.
