// firebase-config.js
// Your Firebase configuration (from Step 3)
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

let db; // Firestore instance

function initializeFirebase() {
  try {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("✅ Firebase initialized successfully!");
  } catch (error) {
    console.error("❌ Firebase initialization error:", error);
  }
}

// ================ CONTACT FORM ================
function setupForms() {
  // Contact Form
  const contactForm = document.getElementById('contactFormElement');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const message = document.getElementById('messageText').value.trim();
      
      if (!name || !email || !message) {
        showMessage('Please fill all fields', 'error');
        return;
      }
      
      const submitBtn = document.getElementById('submitBtn');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;
      
      try {
        // Save to Firestore
        await db.collection('contactSubmissions').add({
          name: name,
          email: email,
          message: message,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          pageUrl: window.location.href,
          userAgent: navigator.userAgent
        });
        
        showMessage('Message sent successfully! We\'ll get back to you soon.', 'success');
        contactForm.reset();
      } catch (error) {
        console.error('Error saving contact:', error);
        showMessage('Error sending message. Please try again.', 'error');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }
  
  // Newsletter Signup
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('newsletterEmail').value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
      }
      
      try {
        await db.collection('newsletterSubscribers').add({
          email: email,
          subscribedAt: firebase.firestore.FieldValue.serverTimestamp(),
          source: 'website',
          active: true
        });
        
        alert('Thank you for subscribing!');
        newsletterForm.reset();
      } catch (error) {
        console.error('Error saving subscriber:', error);
        alert('Subscription failed. Please try again.');
      }
    });
  }
}

// ================ VISITOR COUNTER ================
async function loadCounter() {
  try {
    const counterDoc = await db.collection('siteStats').doc('visitorCounter').get();
    let count = 0;
    
    if (counterDoc.exists) {
      count = counterDoc.data().count || 0;
    } else {
      // Create counter if it doesn't exist
      await db.collection('siteStats').doc('visitorCounter').set({
        count: 0,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    document.getElementById('visitorCount').textContent = count;
  } catch (error) {
    console.error('Error loading counter:', error);
  }
}

async function incrementCounter() {
  try {
    const counterRef = db.collection('siteStats').doc('visitorCounter');
    
    // Atomically increment the counter
    await counterRef.update({
      count: firebase.firestore.FieldValue.increment(1),
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update display
    const updatedDoc = await counterRef.get();
    document.getElementById('visitorCount').textContent = updatedDoc.data().count;
  } catch (error) {
    console.error('Error incrementing counter:', error);
  }
}

// ================ LOAD RECENT SUBMISSIONS ================
async function loadRecentSubmissions() {
  try {
    const submissionsList = document.getElementById('submissionsList');
    submissionsList.innerHTML = '<p>Loading...</p>';
    
    const querySnapshot = await db.collection('contactSubmissions')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
    
    if (querySnapshot.empty) {
      submissionsList.innerHTML = '<p>No submissions yet.</p>';
      return;
    }
    
    let html = '';
    querySnapshot.forEach(doc => {
      const data = doc.data();
      html += `
        <div class="data-item">
          <strong>${data.name}</strong> (${data.email})<br>
          <p>${data.message}</p>
          <small>${data.timestamp?.toDate().toLocaleString() || 'Recently'}</small>
        </div>
      `;
    });
    
    submissionsList.innerHTML = html;
  } catch (error) {
    console.error('Error loading submissions:', error);
    document.getElementById('submissionsList').innerHTML = '<p class="error">Error loading data</p>';
  }
}

// ================ UTILITY FUNCTIONS ================
function showMessage(text, type) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

// ================ CRUD OPERATIONS EXAMPLES ================
class FirebaseCRUD {
  // Create
  async addData(collectionName, data) {
    try {
      const docRef = await db.collection(collectionName).add({
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Read
  async getData(collectionName, limit = 50) {
    try {
      const querySnapshot = await db.collection(collectionName)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      
      const data = [];
      querySnapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Update
  async updateData(collectionName, docId, data) {
    try {
      await db.collection(collectionName).doc(docId).update(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Delete
  async deleteData(collectionName, docId) {
    try {
      await db.collection(collectionName).doc(docId).delete();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export for use in browser console
window.firebaseCRUD = new FirebaseCRUD();