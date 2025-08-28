import { Twilio } from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Validate environment variables
if (!accountSid || !authToken || !phoneNumber) {
  console.log(accountSid, authToken, phoneNumber);
  console.error("Missing Twilio environment variables:", {
    hasAccountSid: !!accountSid,
    hasAuthToken: !!authToken,
    hasPhoneNumber: !!phoneNumber,
  });
}

export const twilioClient = new Twilio(accountSid, authToken);
export const twilioNumber = phoneNumber;
