const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {CloudTasksClient} = require("@google-cloud/tasks");

admin.initializeApp();

const db = admin.firestore();
const tasksClient = new CloudTasksClient();

// Configuration for the Cloud Tasks queue
const PROJECT_ID = process.env.GCLOUD_PROJECT;
const LOCATION = "us-central1"; // Or your preferred location
const QUEUE_NAME = "reminder-queue";

/**
 * Listens for new moments and schedules a push notification if a reminderDate is set.
 */
exports.scheduleReminder = functions.firestore
    .document("users/{userId}/moments/{momentId}")
    .onCreate(async (snapshot, context) => {
      const moment = snapshot.data();
      const {userId, momentId} = context.params;

      // Exit if there's no reminder date
      if (!moment.reminderDate) {
        return null;
      }

      const reminderTime = new Date(moment.reminderDate);
      const now = new Date();

      // Exit if the reminder time is in the past
      if (reminderTime <= now) {
        functions.logger.log(
            `Reminder for moment ${momentId} is in the past. Skipping.`,
        );
        return null;
      }

      // Get the user's FCM tokens
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        functions.logger.error(`User document ${userId} not found.`);
        return null;
      }
      const fcmTokens = userDoc.data().fcmTokens;
      if (!fcmTokens || fcmTokens.length === 0) {
        functions.logger.log(`No FCM tokens for user ${userId}. Skipping.`);
        return null;
      }

      // Get the URL of the sendReminder HTTP function
      const functionUrl = `https://${LOCATION}-${PROJECT_ID}.cloudfunctions.net/sendReminder`;

      // Create the task payload
      const payload = {
        fcmTokens,
        title: "תזכורת: לונה",
        body: moment.text,
      };

      // Create the task
      const task = {
        httpRequest: {
          httpMethod: "POST",
          url: functionUrl,
          body: Buffer.from(JSON.stringify(payload)).toString("base64"),
          headers: {
            "Content-Type": "application/json",
          },
        },
        scheduleTime: {
          seconds: reminderTime.getTime() / 1000,
        },
      };

      const parent = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);

      try {
        await tasksClient.createTask({parent, task});
        functions.logger.log(
            `Scheduled reminder for moment ${momentId} at ${reminderTime}`,
        );
      } catch (error) {
        functions.logger.error("Error scheduling task:", error);
      }

      return null;
    });

/**
 * An HTTP-triggered function that sends a push notification.
 */
exports.sendReminder = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const {fcmTokens, title, body} = req.body;

  if (!fcmTokens || !title || !body) {
    res.status(400).send("Bad Request: Missing fcmTokens, title, or body.");
    return;
  }

  const message = {
    notification: {
      title,
      body,
    },
    tokens: fcmTokens,
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    functions.logger.log("Successfully sent message:", response);
    // Cleanup invalid tokens if any
    if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                failedTokens.push(fcmTokens[idx]);
            }
        });
        functions.logger.log('List of tokens that caused failures:', failedTokens);
        // Here you could add logic to remove failed tokens from Firestore
    }
    res.status(200).send("Notification sent successfully.");
  } catch (error) {
    functions.logger.error("Error sending message:", error);
    res.status(500).send("Error sending notification.");
  }
});
