import { Model } from "sequelize";
export default async (sequelize, DataTypes) => {
  class Attendee extends Model {
    static associate(models) {
      Attendee.belongsTo(models.Event, { foreignKey: "eventId" });
    }
  }
  Attendee.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      status: {
        type: DataTypes.ENUM("Attending", "Not Attending", "Pending"),
        defaultValue: "Pending",
      },
    },
    {
      sequelize,
      modelName: "Attendee",
    }
  );
  return Attendee;
};
