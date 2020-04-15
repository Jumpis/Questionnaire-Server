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
const { Event, Question, AuthKey, Like } = require("./models");

// Routes
const audience = require("./Router/audience");
const event = require("./Router/event");
const presentor = require("./Router/presentor");
const user = require("./Router/user");

// MiddleWare
const verification = require("./Middlewares/verification");

// Modules
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(cors({ credentials: true, origin : 'http://localhost:3000' }));
app.use(verification);

app.get("/", (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

// 라우팅
app.use("/user", user);
app.use("/audience", audience);
app.use("/presentor", presentor);
app.use("/event", event);


const authKeyGenerator = () => {
  return String(Math.floor(Math.random() * Math.pow(10,9)));
};

io.on("connect", (socket) => {
  
  console.log('connected');
  let newAuthKey = authKeyGenerator();

  // Join 이벤트 수신
  socket.on("join", ({ eventId, authKey }) => {

    // client에서 보낸 authKey가 있는지 없는지 확인 
    if(!authKey){
      // authKey가 없으면 만들어주고 만든 값을 클라이언트에게 보내준다
      AuthKey.findOrCreate({
        where : { authKey : newAuthKey }})
      .then(() => {
        socket.emit('authKey', { newAuthKey });
      });
    } else {
      // authKey가 있으면, authKey가 유효한지 확인
      AuthKey.findOne({ where : { authKey }})
        .then(data => {
          // 유효하지 않은 authKey인 경우
          if(!data){
            return socket.emit('needNewKey', { result : false });
          } 
        })
    };

    Event.findOne({ where : {
      id : eventId
    }})
    .then( data => {
      if(!data){
        socket.emit('notfound', { result : 'event not found'})
      } else {
        let eventId = data.id
        // room 만들기
        socket.join(eventId);
  
        Question.findAll( { where : { eventId }})
        .then(data => {
          io.to(eventId).emit('allMessages', { data })
        });
      };      
    });
  }); 

  socket.on('sendMessage', ({ eventId, content, authKey }) => {
    eventId = parseInt(eventId);
    if(1 === eventId){
      console.log('sendMessage ON')
    };
    Question.create({
      questioner : authKey,
      content,
      eventId
    })
    .then( () => {
      return Question.findAll( { where : { eventId }})
    })
    .then(data => {
      io.to(eventId).emit('allMessages', { data })
    });
  })

  socket.on('sendAnswered', ({ boolean, questionId, eventId }) => {
    Question.update(
      { answered : boolean },
      { where : { id : questionId }}
    )
    .then(() => {
      return Question.findAll( { where : { eventId }})
    })
    .then(data => {
      io.to(eventId).emit('allMessages', { data })
    })



  });

  socket.on('sendLike', ({ authKey, questionId, eventId }) => {
    // 좋아요 버튼이 눌렸음을 수신.
    console.log('sendLike ON')
    // Like 테이블에서 레코드 없으면 만들어준다
    Like.findOrCreate( { where : {
      questionId,
      audience_id : authKey
    },
    defaults : {
      like : true
    }
  })
  .spread((instance, created) => {
    // 레코드가 새로 생성되었다면
    if(created){
      // Question 테이블에서 like가 true인 레코드 개수를 세어 반환한다
      Question.findAndCountAll({
          include : [ {
            model : Like,
            required : true,
            where : { like : true , questionId : instance.questionId }
          }],
      })
      .then(data => {
        console.log('this is data : ', data)
        Question.update(
          { numberOfLikes : data.count },
          { where : { id : questionId }}
        )
        .then(() => {
          Question.findAll( { where : { eventId }})
          .then(data => {
            io.to(eventId).emit('allMessages', { data })
          });
        })
      });
    } else {      
      Like.update(
        { like : !instance.like},
        { where : {
          id : instance.id
        }}
      )
      .then(() => {
        Question.findAndCountAll({
          include : [ {
            model : Like,
            required : true,
            where : { like : true , questionId : instance.questionId }
          }],
      })
      .then(data => {
        Question.update(
          { numberOfLikes : data.count },
          { where : { id : questionId }}
        )
        .then(() => {
          Question.findAll( { where : { eventId }})
          .then(data => {
            io.to(eventId).emit('allMessages', { data })
          });
        })
      });
      })
    }
  })
  });



});

http.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);

