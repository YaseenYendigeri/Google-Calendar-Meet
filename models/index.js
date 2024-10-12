import { Sequelize, DataTypes } from "sequelize";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import dbConfig from "../config/config.js";
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  maxConcurrentQueries: 100,
  benchmark: true,
  logging: false,
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
});

const db = {};
const excludedFiles = [".", "..", "index.js"];
let files = await fs.readdir("models");

for (let fileName of files) {
  if (!excludedFiles.includes(fileName) && path.extname(fileName) === ".js") {
    const getModel = await import("./" + fileName);
    let model = await getModel.default(sequelize, DataTypes);
    db[model.name] = model;
  }
}
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;
db.sequelize.sync({ force: false }).then(() => {
  console.log("yes re-sync done!");
});

export default db;
