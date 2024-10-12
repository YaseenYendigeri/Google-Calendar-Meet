import { Model } from "sequelize";
export default async (sequelize, DataTypes) => {
  class Event extends Model {
    static associate(models) {
      Event.belongsTo(models.User, { foreignKey: "userId" });
      Event.hasMany(models.Attendee, {
        foreignKey: "eventId",
        as: "attendees",
      });
    }
  }
  Event.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      date: { type: DataTypes.DATE, allowNull: false },
      location: { type: DataTypes.STRING },
      status: {
        type: DataTypes.ENUM("Scheduled", "Completed", "Cancelled"),
        defaultValue: "Scheduled",
      },
    },
    {
      sequelize,
      modelName: "Event",
    }
  );
  return Event;
};
