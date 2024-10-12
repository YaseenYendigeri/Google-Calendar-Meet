const { google } = require("googleapis");
const utils = require("../utils/utils.js");
const db = require("../models");
const moment = require("moment");
const User = db.user;

const Event = db.event;
const Attendee = db.attendee;

const calendar = google.calendar({
  version: "v3",
  auth: process.env.API_KEY,
});

const drive = google.drive({
  version: "v3",
  auth: process.env.API_KEY,
});

const auth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URL
);

const scopes = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive",
];

const getGoogle = async (req, res) => {
  try {
    const isAuth = await utils.isAuthenticated(req.headers.authorization);
    if (isAuth && isAuth.role <= 4) {
      const url = auth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
      });
      res.send({
        success: true,
        status: "success",
        message: "Google Calendar Auth URL fetched successfully",
        redirect_url: url,
      });
    } else {
      res
        .status(403)
        .send({ success: false, message: "You don't have access" });
    }
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error checking authentication" });
  }
};

const googleRedirect = async (req, res) => {
  try {
    const isAuth = await utils.isAuthenticated(req.headers.authorization);

    if (isAuth && isAuth.role <= 4) {
      const { code } = req.body;
      const user = isAuth.userId;
      google.options({ auth: auth2Client });
      const decodedCode = decodeURIComponent(code);
      try {
        const { tokens } = await auth2Client.getToken(decodedCode);
        console.log("Token:", tokens);
        await User.update({ tokens: tokens }, { where: { id: isAuth.userId } });
        res
          .status(200)
          .send({ success: true, message: "You have successfully logged in" });
      } catch (error) {
        res
          .status(500)
          .send({
            success: false,
            message: "Error exchanging code for tokens",
          });
      }
    } else {
      res
        .status(403)
        .send({ success: false, message: "You don't have access" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, message: "Internal server error" });
  }
};

const createSchedualEvents = async (req, res) => {
  try {
    const isAuth = await utils.isAuthenticated(req.headers.authorization);
    if (isAuth && isAuth.role <= 4) {
      const user = isAuth.userId;
      let current_user = await User.findOne({ where: { id: isAuth.userId } });
      if (current_user.tokens == null) {
        return res
          .status(401)
          .send({ success: false, message: "User not authenticated" });
      }

      auth2Client.setCredentials(current_user.tokens);
      if (auth2Client.isTokenExpiring()) {
        try {
          auth2Client.credentials.refresh_token =
            current_user.tokens.refresh_token;
          const refreshedTokens = await auth2Client.refreshAccessToken();
          await User.update(
            { tokens: refreshedTokens.credentials },
            { where: { id: current_user.id } }
          );
        } catch (error) {
          return res
            .status(500)
            .send({ success: false, message: "Error refreshing access token" });
        }
      }
      const {
        attendees,
        startTime,
        duration,
        description,
        summary,
        location,
        visibility,
        round,
        cid,
        guestsCanSeeOtherGuests,
      } = req.body;

      const existingEvent = await Event.findAll({
        where: { cid: cid, userId: user, round: round },
      });
      if (existingEvent.length > 0) {
        return res
          .status(400)
          .send({
            success: false,
            message: "Event with this round already exists",
          });
      }
      let start_date = moment.tz(startTime, "Asia/Kolkata").utcOffset(0);
      let end_date = moment
        .tz(startTime, "Asia/Kolkata")
        .add(duration, "minutes")
        .utcOffset(0);
      const event = {
        summary: summary,
        location: location,
        description: description,
        start: {
          dateTime: start_date,
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: end_date,
          timeZone: "Asia/Kolkata",
        },
        attendees: attendees.map((email) => ({ email })),
        visibility: visibility,
        guestsCanSeeOtherGuests: guestsCanSeeOtherGuests,
        conferenceData: {
          createRequest: {
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
            requestId: "random-request-id",
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 10 },
          ],
        },
      };

      try {
        const response = await calendar.events.insert({
          auth: auth2Client,
          calendarId: "primary",
          resource: event,
          sendUpdates: "all",
          conferenceDataVersion: 1,
        });
        const eventId = response.data.id;
        await Event.create({
          userId: user,
          cid: cid,
          eventId: eventId,
          round: round,
        });
        const attendeeEmails = attendees.map((email) => ({ email, eventId }));
        await Attendee.bulkCreate(attendeeEmails);
        res.send({
          success: true,
          eventData: response.data,
          message: "Event created successfully",
        });
      } catch (error) {
        res
          .status(500)
          .send({
            success: false,
            message: "Error creating event",
            error: error.message,
          });
      }
    } else {
      res.status(403).send({ success: false, message: "Unauthorized" });
    }
  } catch (error) {
    res.status(403).send({ success: false, error: error.message });
  }
};
const getAllScheduleEvent = async (req, res) => {
  const isAuth = await utils.isAuthenticated(req.headers.authorization);
  if (isAuth && isAuth.role <= 4) {
    const user = isAuth.userId;
    const cid = req.params.cid;
    const events = await Event.findAll({
      where: { userId: user, cid: cid },
      order: [["round", "ASC"]],
      include: [
        {
          model: Attendee,
          attributes: ["email"],
        },
      ],
    });
    const eventData = events.map((event) => ({
      ...event.toJSON(),
      attendees: event.attendees.map((attendee) => attendee.email),
    }));

    res.status(200).send({
      success: true,
      data: eventData,
      message: "Events Found Successfully",
    });
  } else {
    res.status(401).send({ success: false, message: "User not authenticated" });
  }
};

const getScheduleEvent = async (req, res) => {
  try {
    const isAuth = await utils.isAuthenticated(req.headers.authorization);
    if (isAuth && isAuth.role <= 4) {
      const user = isAuth.userId;
      let current_user = await User.findOne({ where: { id: isAuth.userId } });
      if (current_user.tokens == null) {
        return res
          .status(401)
          .send({ success: false, message: "User not authenticated" });
      }

      auth2Client.setCredentials(current_user.tokens);
      if (auth2Client.isTokenExpiring()) {
        try {
          auth2Client.credentials.refresh_token =
            current_user.tokens.refresh_token;
          const refreshedTokens = await auth2Client.refreshAccessToken();
          await User.update(
            { tokens: refreshedTokens.credentials },
            { where: { id: current_user.id } }
          );
        } catch (error) {
          return res
            .status(500)
            .send({ success: false, message: "Error refreshing access token" });
        }
      }

      try {
        const eventId = req.params.eventId;
        const response = await calendar.events.get({
          auth: auth2Client,
          calendarId: "primary",
          eventId: eventId,
        });
        res
          .status(200)
          .send({
            success: true,
            data: response.data,
            message: "Events Found Successfully",
          });
      } catch (error) {
        res
          .status(500)
          .send({
            success: false,
            data: response.data,
            message: "Error fetching event",
            error: error.message,
          });
      }
    } else {
      res
        .status(403)
        .send({ success: false, data: response.data, message: "unauthorized" });
    }
  } catch (error) {
    res
      .status(403)
      .send({ success: false, data: response.data, error: error.message });
  }
};

const updateScheduleEvent = async (req, res) => {
  try {
    const isAuth = await utils.isAuthenticated(req.headers.authorization);
    if (isAuth && isAuth.role <= 4) {
      const user = isAuth.userId;
      const eventId = req.params.eventId;
      const {
        attendees,
        summary,
        location,
        startTime,
        duration,
        visibility,
        description,
        round,
        guestsCanSeeOtherGuests,
      } = req.body;

      let current_user = await User.findOne({ where: { id: isAuth.userId } });
      if (current_user.tokens == null) {
        return res
          .status(401)
          .send({ success: false, message: "User not authenticated" });
      }

      auth2Client.setCredentials(current_user.tokens);
      if (auth2Client.isTokenExpiring()) {
        try {
          auth2Client.credentials.refresh_token =
            current_user.tokens.refresh_token;
          const refreshedTokens = await auth2Client.refreshAccessToken();
          await User.update(
            { tokens: refreshedTokens.credentials },
            { where: { id: current_user.id } }
          );
        } catch (error) {
          return res
            .status(500)
            .send({ success: false, message: "Error refreshing access token" });
        }
      }

      try {
        const eventResponse = await calendar.events.get({
          auth: auth2Client,
          calendarId: "primary",
          eventId: eventId,
        });
        let start_date = moment.tz(startTime, "Asia/Kolkata").utcOffset(0);
        let end_date = moment
          .tz(startTime, "Asia/Kolkata")
          .add(duration, "minutes")
          .utcOffset(0);
        const existingEvent = eventResponse.data;
        existingEvent.attendees = attendees.map((email) => ({ email }));
        existingEvent.summary = summary;
        existingEvent.location = location;
        existingEvent.visibility = visibility;
        existingEvent.description = description;
        existingEvent.start.dateTime = start_date;
        existingEvent.end.dateTime = end_date;
        existingEvent.guestsCanSeeOtherGuests = guestsCanSeeOtherGuests;

        const updatedEvent = await calendar.events.update({
          auth: auth2Client,
          calendarId: "primary",
          eventId: eventId,
          sendUpdates: "all",
          resource: existingEvent,
        });
        await Attendee.destroy({
          where: {
            eventId: eventId,
          },
        });
        await Attendee.bulkCreate(
          attendees.map((email) => ({ email, eventId }))
        );
        await Event.update(
          {
            round: round,
          },
          {
            where: {
              eventId: eventId,
            },
          }
        );

        res.send({
          success: true,
          data: updatedEvent.data,
          message: "Event updated successfully",
        });
      } catch (error) {
        return res
          .status(500)
          .send({
            success: false,
            message: "Error updating event",
            error: error.message,
          });
      }
    } else {
      res
        .status(403)
        .send({
          success: false,
          message: "Unauthorized",
          error: error.message,
        });
    }
  } catch (error) {
    res
      .status(500)
      .send({
        success: false,
        message: "You don't have the access",
        error: error.message,
      });
  }
};

const deleteScheduleEvent = async (req, res) => {
  try {
    const isAuth = await utils.isAuthenticated(req.headers.authorization);
    if (isAuth && isAuth.role <= 4) {
      const user = isAuth.userId;
      let current_user = await User.findOne({ where: { id: isAuth.userId } });
      if (current_user.tokens == null) {
        return res
          .status(401)
          .send({ success: false, message: "User not authenticated" });
      }
      auth2Client.setCredentials(current_user.tokens);
      if (auth2Client.isTokenExpiring()) {
        try {
          auth2Client.credentials.refresh_token =
            current_user.tokens.refresh_token;
          const refreshedTokens = await auth2Client.refreshAccessToken();
          await User.update(
            { tokens: refreshedTokens.credentials },
            { where: { id: current_user.id } }
          );
        } catch (error) {
          return res
            .status(500)
            .send({ success: false, message: "Error refreshing access token" });
        }
      }
      const eventId = req.params.eventId;
      const event = await Event.findOne({ where: { eventId: eventId } });
      if (!event) {
        return res
          .status(404)
          .send({ success: false, message: "Event not found" });
      }
      await calendar.events.delete({
        auth: auth2Client,
        calendarId: "primary",
        eventId: eventId,
        sendUpdates: "all",
      });
      await Event.destroy({ where: { eventId: eventId } });
      res
        .status(200)
        .send({ success: true, message: "Event deleted successfully" });
    } else {
      res.status(403).send({ success: false, message: "Unauthorized" });
    }
  } catch (error) {
    res.status(403).send({ error: "You don't have access" });
  }
};

const logout = async (req, res) => {
  try {
    const isAuth = await utils.isAuthenticated(req.headers.authorization);
    if (isAuth && isAuth.role <= 4) {
      const user = isAuth.userId;

      let current_user = await User.findOne({ where: { id: isAuth.userId } });
      if (current_user.tokens == null) {
        return res
          .status(401)
          .send({ success: false, message: "User not authenticated" });
      }

      auth2Client.setCredentials(current_user.tokens);
      if (auth2Client.isTokenExpiring()) {
        try {
          auth2Client.credentials.refresh_token =
            current_user.tokens.refresh_token;
          const refreshedTokens = await auth2Client.refreshAccessToken();
          await User.update(
            { tokens: refreshedTokens.credentials },
            { where: { id: current_user.id } }
          );
        } catch (error) {
          return res
            .status(500)
            .send({ success: false, message: "Error refreshing access token" });
        }
      }

      if (current_user.tokens) {
        await User.update({ tokens: null }, { where: { id: current_user.id } });
        res.send({ success: true, message: "Logged out successfully" });
      } else {
        res.send({ success: true, message: "You are already logged out" });
      }
    } else {
      res.status(403).send({ success: false, message: "Unauthorized" });
    }
  } catch (error) {
    res.status(403).send({ success: false, message: "You don't have access" });
  }
};

module.exports = {
  getGoogle,
  googleRedirect,
  createSchedualEvents,
  getAllScheduleEvent,
  getScheduleEvent,
  updateScheduleEvent,
  deleteScheduleEvent,
  logout,
};
