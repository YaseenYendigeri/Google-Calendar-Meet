import express from "express";
import * as googleController from "../controllers/google-calendar.js";
const router = express.Router();

// Route to get Google OAuth2 URL
router.get("/google", googleController.getGoogle);

// Route for Google OAuth2 redirection
router.get("/google/redirect", googleController.googleRedirect);

// Route to create a scheduled event
router.post("/event-create", googleController.createSchedualEvents);

// Route to get all scheduled events for a specific CID
router.get("/events/:cid", googleController.getAllScheduleEvent);

// Route to get a specific scheduled event by eventId
router.get("/event/:eventId", googleController.getScheduleEvent);

// Route to update an existing event by eventId
router.put("/event/:eventId", googleController.updateScheduleEvent);

// Route to delete an event by eventId
router.delete("/event/:eventId", googleController.deleteScheduleEvent);

export default router;
