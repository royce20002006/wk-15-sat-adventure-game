const http = require('http');
const fs = require('fs');

const { Player } = require('./game/class/player');
const { World } = require('./game/class/world');

const worldData = require('./game/data/basic-world-data');
const { url } = require('inspector');

let player;
let world = new World();
world.loadWorld(worldData);

const server = http.createServer((req, res) => {

  /* ============== ASSEMBLE THE REQUEST BODY AS A STRING =============== */
  let reqBody = '';
  req.on('data', (data) => {
    reqBody += data;
  });

  req.on('end', () => { // After the assembly of the request body is finished
    /* ==================== PARSE THE REQUEST BODY ====================== */
    if (reqBody) {
      req.body = reqBody
        .split("&")
        .map((keyValuePair) => keyValuePair.split("="))
        .map(([key, value]) => [key, value.replace(/\+/g, " ")])
        .map(([key, value]) => [key, decodeURIComponent(value)])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
    }

    /* ======================== ROUTE HANDLERS ========================== */
    // Phase 1: GET /
    if (req.method === 'GET' && req.url === '/') {
      res.statusCode = 200;
      const np = fs.readFileSync('./views/new-player.html', 'utf-8').replace(/#{availableRooms}/g, world.availableRoomsToString());
      res.setHeader('content-type', 'text/html');
      res.write(np);
      res.end();
      return;

    }

    // Phase 2: POST /player
    if (req.method === 'POST' && req.url === '/player') {
      let name = req.body.name;
      let roomId = req.body.roomId;
      let room = world.rooms[roomId];
      player = new Player(name, room);
      console.log(player)
      res.statusCode = 302;
      res.setHeader('location', `./rooms/${roomId}`);
      res.end();
      return
    }
    // Phase 3: GET /rooms/:roomId
    if (req.method === 'GET' && req.url.startsWith('/rooms/')) {
     
      const urlParts = req.url.split('/');
      const roomId = urlParts[2];
      const currentPlayerRoomId = player.currentRoom.id
      if (Number(roomId) !== currentPlayerRoomId) {
        res.statusCode = 302
        res.setHeader('Location', `/rooms/${currentPlayerRoomId}`)
        res.end()
        return
      };
      
      if (urlParts.length === 3) { 
        const roomUrl = fs.readFileSync('./views/room.html', 'utf-8');
        const room = world.rooms[roomId]
        const resBody = roomUrl
          .replace(/#{roomName}/g, room.name)
          .replace(/#{roomId}/g, roomId)
          .replace(/#{roomItems}/g, room.itemsToString())
          .replace(/#{inventory}/g, player.inventoryToString())
          .replace(/#{exits}/g, room.exitsToString());

        res.statusCode = 200;
        res.setHeader('content-type', 'text/html');
        res.write(resBody);
        res.end();
        return;
      }

    }
    
    // Phase 4: GET /rooms/:roomId/:direction
    if (req.method === 'GET' && req.url.startsWith('/rooms/')) {
      const urlParts = req.url.split('/');
      if (urlParts.length === 4) {
        const roomId = urlParts[2];
        const direction = urlParts[3];
        const newRoom = player.move(direction[0]);

        if (player.currentRoom.id !== Number(roomId)) {
          res.statusCode = 302;
          res.setHeader('Location', `/rooms/${player.currentRoom.id}`);
          return res.end();
        }

        res.statusCode = 302;
        res.setHeader('Location', `/rooms/${newRoom.id}`)
        return res.end();

      }
    }

    // Phase 5: POST /items/:itemId/:action
    if (req.method === 'POST' && req.url.startsWith('/items/')) {
      const urlSplit = req.url.split('/');

      if (urlSplit.length === 4) {
        const itemId = urlSplit[2];
        const action = urlSplit[3];

        try {
          switch(action) {
            case 'drop':
              player.dropItem(itemId);
              break;
            case 'eat':
              player.eatItem(itemId);
              break;
            case 'take':
              player.takeItem(itemId);
              break;
        }
        const key = 'n' || 'e' || 'w' || null;
        res.statusCode = 302;
        res.setHeader('Location', `rooms/${currId}/${key}`)
        return res.end();
      } catch(error) {
        const page = fs.readFileSync('./views/error.html','utf-8');

        const resBody = page
          .replace(/#{errorMessage}/g, error.message)
          .replace(/#{roomId}/g, player.currentRoom.id);

        res.statusCode = 302;
        res.setHeader('Location', 'views/error.html');
        return res.end(resBody);
      }

        
      }

    }
    // Phase 6: Redirect if no matching route handlers
    if (!player){
      res.statusCode = 302;
      res.setHeader("Location", '/');
      res.end();
      return;
    }
    else{
      res.statusCode = 302;
      res.setHeader("Location", `/rooms/${player.currentRoom.id}`);
      res.end();
      return;
    }

   

  })
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));