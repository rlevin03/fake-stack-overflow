## Getting Started

Run `npm install` in the root directory to install all dependencies for the `client`, `server`, and `shared` folders.

### Installing Dependencies
To install dependencies separately:
```
cd server
npm install
cd ../client
npm install
```

### Setting Up MongoDB
1. Create a MongoDB account
2. Navigate to mongodb.com and create your account
3. The free tier will be more than enough for your needs, and the name doesn't matter all that much
4. Click on "Create Deployment" and be sure to save your connection string with your visible password for the time being
5. For convenience, in the left navigation, click on "Network Access"
6. Allow access from any IP address so that you don't have to approve every new address

### Populating the Database
1. Go to the server directory in your repository:
   ```
   cd server
   ```
   Or if you are in the client directory:
   ```
   cd ../server
   ```
2. Then populate the database by running:
   ```
   npx ts-node populate_db.ts <your connection string>/fake_so
   ```

### Running Locally
To start the application locally:
1. Start the server:
   ```
   cd server
   npm run start
   ```
2. In a separate terminal, start the client:
   ```
   cd client
   npm run start
   ```

### Configuring Environment Variables
Create `.env` files in both the server and client folders with the following fields:

For the client `.env`:
```
REACT_APP_SERVER_URL=<the backend deployment link>
```

For the server `.env`:
```
MONGODB_URI=<your connection string>
CLIENT_URL=<the frontend deployment link>
PORT=8000
GEMINI_API_KEY=<a random assortment of letters and numbers>
```

### Setting Up Deployment
1. Create a Render account
2. Create deployments for both the frontend and backend
3. You can verify that the backend works by clicking on the link for the backend deployment. If it shows "hello world," then it's running
4. For the frontend, you should see the login page at the deployment link

### Deployment Links
- Frontend: https://cs4530-s25-605.onrender.com/
- Backend: https://cs4530-s25-605-api.onrender.com/

{ : .note } Refer to [IP1](https://neu-se.github.io/CS4530-Spring-2025/assignments/ip1) and [IP2](https://neu-se.github.io/CS4530-Spring-2025/assignments/ip2) for further instructions related to setting up MongoDB, setting environment variables, and running the client and server.

## Codebase Folder Structure

- `client`: Contains the frontend application code, responsible for the user interface and interacting with the backend. This directory includes all React components and related assets.
- `server`: Contains the backend application code, handling the logic, APIs, and database interactions. It serves requests from the client and processes data accordingly.
- `shared`: Contains all shared type definitions that are used by both the client and server. This helps maintain consistency and reduces duplication of code between the two folders. The type definitions are imported and shared within each folder's `types/types.ts` file.

## Database Architecture

The schemas for the database are documented in the directory `server/models/schema`.
A class diagram for the schema definition is shown below:

![Class Diagram](class-diagram.png)

## API Routes

### `/answer`

| Endpoint   | Method | Description      |
| ---------- | ------ | ---------------- |
| /addAnswer | POST   | Add a new answer |

### `/comment`

| Endpoint    | Method | Description       |
| ----------- | ------ | ----------------- |
| /addComment | POST   | Add a new comment |

### `/messaging`

| Endpoint     | Method | Description           |
| ------------ | ------ | --------------------- |
| /addMessage  | POST   | Add a new message     |
| /getMessages | GET    | Retrieve all messages |

### `/question`

| Endpoint          | Method | Description                     |
| ----------------- | ------ | ------------------------------- |
| /getQuestion      | GET    | Fetch questions by filter       |
| /getQuestionById/ | GET    | Fetch a specific question by ID |
| /addQuestion      | POST   | Add a new question              |
| /upvoteQuestion   | POST   | Upvote a question               |
| /downvoteQuestion | POST   | Downvote a question             |

### `/tag`

| Endpoint                   | Method | Description                                   |
| -------------------------- | ------ | --------------------------------------------- |
| /getTagsWithQuestionNumber | GET    | Fetch tags along with the number of questions |
| /getTagByName/             | GET    | Fetch a specific tag by name                  |

### `/user`

| Endpoint         | Method | Description                    |
| ---------------- | ------ | ------------------------------ |
| /signup          | POST   | Create a new user account      |
| /login           | POST   | Log in as a user               |
| /resetPassword   | PATCH  | Reset user password            |
| /getUser/        | GET    | Fetch user details by username |
| /getUsers        | GET    | Fetch all users                |
| /deleteUser/     | DELETE | Delete a user by username      |
| /updateBiography | PATCH  | Update user biography          |

### `/chat`

| Endpoint                    | Method | Description                                                                 |
| --------------------------- | ------ | --------------------------------------------------------------------------- |
| `/createChat`               | POST   | Create a new chat.                                                          |
| `/:chatId/addMessage`       | POST   | Add a new message to an existing chat.                                      |
| `/:chatId`                  | GET    | Retrieve a chat by its ID, optionally populating participants and messages. |
| `/:chatId/addParticipant`   | POST   | Add a new participant to an existing chat.                                  |
| `/getChatsByUser/:username` | GET    | Retrieve all chats for a specific user based on their username.             |

### `/games`

| Endpoint | Method | Description           |
| -------- | ------ | --------------------- |
| /create  | POST   | Create a new game     |
| /join    | POST   | Join an existing game |
| /leave   | POST   | Leave a game          |
| /games   | GET    | Retrieve all games    |

## Running Stryker Mutation Testing

Mutation testing helps you measure the effectiveness of your tests by introducing small changes (mutations) to your code and checking if your tests catch them. To run mutation testing with Stryker, use the following command in `server/`:

```sh
npm run stryker
```

{ : .note } In case you face an "out of memory" error while running Stryker, use the following command to increase the memory allocation to 4GB for Node.js:

```sh
node --max-old-space-size=4096 ./node_modules/.bin/stryker run
```
