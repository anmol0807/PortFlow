# PortFlow – Smart Port Container Management System

PortFlow is a web-based container management system designed to simplify and organize port operations. It provides a centralized dashboard for managing shipping containers, vessels, yard allocations, container tracking, and movement history.

**Live Website:** https://portflow-1d955.web.app/  
**GitHub Repository:** https://github.com/anmol0807/PortFlow

## Project Overview

Managing shipping containers in a port involves tracking container details, assigning vessels, managing storage locations, and monitoring container movements.

PortFlow provides a simple web interface to manage these activities. Firebase is used for user authentication and cloud database storage.

## Features

- User registration and login using email and password
- Dashboard for viewing container and port operation information
- Add, edit, delete, and manage container records
- Add and manage vessel information
- Assign containers to vessels
- Allocate containers to yard locations, blocks, and slots
- Search for and track containers using container IDs
- Maintain container movement history and status changes
- Store and retrieve project data using Firebase Firestore

## Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Website structure |
| CSS3 | Styling and layout |
| JavaScript | Application functionality |
| Firebase Authentication | User registration and login |
| Cloud Firestore | Cloud database |
| Firebase Hosting | Website deployment |
| Git and GitHub | Version control and source code hosting |

## Project Structure

```text
PortFlow/
├── index.html
├── login.html
├── style.css
├── script.js
├── firebase.js
├── port-background.jpg
├── firebase.json
├── .firebaserc
├── .gitignore
└── 404.html
```

## How to Run the Project Locally

1. Clone the repository:

   ```bash
   git clone https://github.com/anmol0807/PortFlow.git
   ```

2. Open the downloaded `PortFlow` folder in Visual Studio Code.

3. Check that the Firebase configuration in `firebase.js` points to the correct Firebase project.

4. Open `login.html` using the VS Code Live Server extension.

5. Register an account or log in to access the dashboard.

Firebase Authentication and Cloud Firestore must be configured, and the relevant security rules must be published for the application to work correctly.

## Firebase Integration

PortFlow uses Firebase services for:

- User authentication
- Storing container information
- Managing vessel records
- Saving yard allocations
- Maintaining movement history

## Project Objectives

- Simplify container management operations
- Improve container tracking and monitoring
- Organize vessel and yard allocation records
- Maintain centralized operational data
- Provide an easy-to-use interface for port management

## Possible Future Improvements

- Advanced analytics and reporting
- Container location visualization
- Real-time operational notifications
- More detailed role-based access control
- Exportable operational reports

## Project Information

| Item | Details |
|---|---|
| Project Name | PortFlow – Smart Port Container Management System |
| Repository Owner | Anmol Sharma |
| Project Category | Web Development |
| Project Type | Academic Project |

## License

This project was developed for educational and academic purposes.

---

PortFlow – Making Port Container Management Simpler and More Organized.
