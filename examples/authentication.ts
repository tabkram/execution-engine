import { ExecutionEngine } from "../src";
import * as fs from "fs";

function registerUser(username: string, password: string) {
  if (username && password) {
    return Promise.resolve(`User ${username} successfully registered`);
  } else {
    Promise.reject("Invalid registration information");
  }
}

function loginUser(username: string, password: string) {
  if (username && password) {
    return `User ${username} successfully logged in`;
  } else {
    throw new Error("Invalid login credentials");
  }
}

function getUserInformation(username: string) {
  const userInfo = {
    fullName: "John Doe",
    email: "john.doe@example.com",
    role: "User",
  };
  return `User Information for ${username}: Full Name - ${userInfo.fullName}, Email - ${userInfo.email}, Role - ${userInfo.role}`;
}

// Sequential consecutive calls for user registration, login, and retrieving user information
const newUser = {
  username: "john_doe",
  password: "secure_password",
};
const executionEngine = new ExecutionEngine();
executionEngine
  .run(registerUser, [newUser.username, newUser.password])
  .then((result) => result);
executionEngine.run(loginUser, [newUser.username, newUser.password]);
executionEngine.run(getUserInformation, [newUser.username]);

// Retrieve the trace
const finalTrace = executionEngine.getTrace();
const jsonString = JSON.stringify(finalTrace, null, 2);

// Write the JSON string to the file
const filePath = process?.argv?.[1]?.replace(".ts", ".json");
fs.writeFile(filePath, jsonString, "utf-8", (err) => {
  if (err) {
    console.error("Error writing JSON to file:", err);
  } else {
    console.log(`JSON data written to ${filePath}`);
  }
});
