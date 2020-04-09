const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config')[env];
const db = {};

let sequelize;
sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });
  sequelize.sync();


db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.Event = require('./event')(sequelize,Sequelize);
db.Like = require('./like')(sequelize,Sequelize);
db.Presentor = require('./presentor')(sequelize,Sequelize);
db.Question = require('./question')(sequelize,Sequelize);

db.Presentor.hasMany(db.Event,{foreignKey:'id'});
db.Event.belongsTo(db.Presentor);

db.Event.hasMany(db.Question,{foreignKey:'id'});
db.Question.belongsTo(db.Event);

db.Question.hasMany(db.Like,{foreignKey:'id'});
db.Like.belongsTo(db.Question);

module.exports = db;
