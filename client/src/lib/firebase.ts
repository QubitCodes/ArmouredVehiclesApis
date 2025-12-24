import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

// Debug: Check if Firebase config is loaded
console.log("Firebase config loaded:", {
  hasApiKey: !!firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

export function initRecaptcha(containerId: string) {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {},
    });
  }
  return recaptchaVerifier;
}

export async function sendPhoneOtp(phoneNumber: string, containerId: string = 'recaptcha-container') {
  const verifier = initRecaptcha(containerId);
  confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
  return confirmationResult;
}

export async function verifyPhoneOtp(otp: string) {
  if (!confirmationResult) {
    throw new Error('No OTP session found. Please request a new code.');
  }
  const result = await confirmationResult.confirm(otp);
  return result.user;
}

export function resetRecaptcha() {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
  confirmationResult = null;
}

export { app };
