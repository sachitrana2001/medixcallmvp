import Twilio from "twilio";
export const twilio = Twilio(
  process.env.TWILIO_SID!,
  process.env.TWILIO_TOKEN!
);
