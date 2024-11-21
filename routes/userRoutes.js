const express = require("express");
const User = require("../models/User");
const userAuth = require("../middleware/userAuth");
const nodemailer = require("nodemailer");
const router = express.Router();

// Add a new to-do item
router.post("/todo/addTodo", userAuth, async(req, res) => {
    const { title, description, scheduledFor } = req.body;

    if (!title) {
        return res.status(200).send({
            status: "Failed",
            message: "Title is required for a to-do item",
        });
    }

    // Validate scheduledFor as a date
    if (!scheduledFor || isNaN(Date.parse(scheduledFor))) {
        return res.status(200).send({
            status: "Failed",
            message: "scheduledFor must be a valid date-time string",
        });
    }

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res
                .status(200)
                .send({ status: "Failed", message: "User not found" });
        }

        user.todos.push({ title, description, scheduledFor });
        await user.save();
        res
            .status(200)
            .send({ status: "Successful", message: "To-do added", user });
    } catch (error) {
        console.error("Error adding to-do:", error);
        res
            .status(500)
            .send({ status: "Failed", message: "Server error, could not add to-do" });
    }
});

// Get all to-do items for a user
router.get("/todo/getAllTodo", userAuth, async(req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res
                .status(200)
                .send({ status: "Failed", message: "User not found" });
        }

        res.status(200).send({ status: "Successful", todos: user.todos });
    } catch (error) {
        console.error("Error retrieving to-dos:", error);
        res.status(500).send({
            status: "Failed",
            message: "Server error, could not retrieve to-dos",
        });
    }
});

// Get user's location
router.get("/location", userAuth, async(req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res
                .status(200)
                .send({ status: "Failed", message: "User not found" });
        }

        res.status(200).send({ status: "Successful", permanentLocation: user.permanentLocation });
    } catch (error) {
        console.error("Error fetching location:", error);
        res.status(500).send({
            status: "Failed",
            message: "Server error, could not fetch location",
        });
    }
});

// Update a to-do's isDone status
router.patch("/todo/updateTodo/:todoId", userAuth, async(req, res) => {
    const { isDone } = req.body;

    if (typeof isDone !== "boolean") {
        return res.status(200).send({
            status: "Failed",
            message: "isDone must be a boolean value",
        });
    }

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res
                .status(200)
                .send({ status: "Failed", message: "User not found" });
        }

        const todo = user.todos.id(req.params.todoId);
        if (!todo) {
            return res
                .status(200)
                .send({ status: "Failed", message: "To-do item not found" });
        }

        todo.isDone = isDone;
        await user.save();
        res.status(200).send({ status: "Successful", todo });
    } catch (error) {
        console.error("Error updating to-do:", error);
        res.status(500).send({
            status: "Failed",
            message: "Server error, could not update to-do",
        });
    }
});

// Delete a to-do item
router.delete("/todo/deleteTodo/:todoId", userAuth, async(req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res
                .status(200)
                .send({ status: "Failed", message: "User not found" });
        }

        const todo = user.todos.id(req.params.todoId);
        if (!todo) {
            return res
                .status(200)
                .send({ status: "Failed", message: "To-do item not found" });
        }

        user.todos.pull({ _id: req.params.todoId });
        await user.save();

        res.status(200).send({
            status: "Successful",
            message: "To-do item deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting to-do:", error);
        res.status(500).send({
            status: "Failed",
            message: "Server error, could not delete to-do",
        });
    }
});

router.post("/emergency/sendAlert", userAuth, async(req, res) => {
    const { message } = req.body;
    console.log(message);

    // Validate request
    if (!message) {
        return res.status(200).send({
            status: "Failed",
            message: "Message content is required",
        });
    }

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(200).send({
                status: "Failed",
                message: "User not found",
            });
        }

        const emergencyContacts = user.emergencyContacts; // Assuming this is an array
        if (!emergencyContacts || emergencyContacts.length === 0) {
            return res.status(200).send({
                status: "Failed",
                message: "No emergency contacts found",
            });
        }

        // Nodemailer setup
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        // Send email to all emergency contacts
        const emailPromises = emergencyContacts.map(contact => {
            if (contact.contactEmail) {
                const emailContent = {
                    to: contact.contactEmail,
                    from: process.env.NODEMAILER_EMAIL,
                    subject: "Emergency Alert: Distance from Home",
                    text: `
                        Alert from ${user.name}:
                        ${message}

                        Please check on them immediately.
                    `,
                };

                return transporter.sendMail(emailContent);
            }
        });

        // Wait for all emails to be sent
        await Promise.all(emailPromises);

        res.status(200).send({
            status: "Successful",
            message: "Alert sent to emergency contacts",
            emergencyContacts
        });
    } catch (error) {
        console.error("Error in sending emergency alert:", error);
        res.status(500).send({
            status: "Failed",
            message: "Server error while sending emergency alert",
        });
    }
});


module.exports = router;