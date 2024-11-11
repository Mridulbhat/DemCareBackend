const express = require("express");
const User = require("../models/User");
const userAuth = require("../middleware/userAuth");
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

module.exports = router;