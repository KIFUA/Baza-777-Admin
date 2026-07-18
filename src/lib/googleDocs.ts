import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file'
];

let cachedAccessToken: string | null = null;

export const getGoogleAccessToken = async (): Promise<string> => {
  if (cachedAccessToken) return cachedAccessToken;

  const provider = new GoogleAuthProvider();
  SCOPES.forEach(scope => provider.addScope(scope));

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token');
    }
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } catch (error) {
    console.error('Error getting Google access token:', error);
    throw error;
  }
};

export const createBirthdayGoogleDoc = async (title: string, content: string) => {
  const token = await getGoogleAccessToken();

  // 1. Create a new document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create document: ${createRes.statusText}`);
  }

  const doc = await createRes.json();
  const documentId = doc.documentId;

  // 2. Insert content
  // Note: Docs API uses "batchUpdate" with requests.
  // This is a simple implementation.
  const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content
          }
        }
      ]
    })
  });

  if (!updateRes.ok) {
    throw new Error(`Failed to update document: ${updateRes.statusText}`);
  }

  return documentId;
};
