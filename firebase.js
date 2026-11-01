import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDIJGSrxfbz5b35E14APpDxbshYbPuHe60",
    authDomain: "portflow-1d955.firebaseapp.com",
    projectId: "portflow-1d955",
    storageBucket: "portflow-1d955.firebasestorage.app",
    messagingSenderId: "921520821981",
    appId: "1:921520821981:web:5a401773f004e70a992d34",
    measurementId: "G-JKEZVHL6YE"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
