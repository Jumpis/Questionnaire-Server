require("dotenv").config();
const jwt = require("jsonwebtoken");
const express = require("express");

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const cors = require("cors");

const port = process.env.PORT;
const bodyParser = require("body-parser");
const morgan = require("morgan");

// DB
const { Presentor, Event, Question } = require("./models");

// Routes
const audience = require("./Router/audience");
const event = require("./Router/event");
const presentor = require("./Router/presentor");
const user = require("./Router/user");

// MiddleWare
const verification = require("./Middlewares/verification")

// Modules
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(cors({ credentials: true }));
app.use(verification);

app.get("/", (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

// 라우팅
app.use("/user", user);
app.use("/audience", audience);
app.use("/presentor", presentor);
app.use("/event", event);

// socket.io
io.on("connect", (socket) => {
  // 연결 확인
  console.log('connected')
  // Join 이벤트 수신
  socket.on("join", ({ eventCode }) => {
    // room 이라는 namespace 만들기
    Event.findOne({ where : {
      code_name : eventCode
    }})
    .then( data => {
      let eventId = data.id
      socket.join(eventId);

      Question.findAll( { where : { eventId}})
      .then(data => {
        io.to(eventId).emit('allMessages', { data})
      });
    });
  }); 
});

http.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

