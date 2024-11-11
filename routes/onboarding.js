const express = require("express");
const User = require("../models/User");
const OtpModel = require("../models/otpModel");
const generateOTP = require("../utils/generateOTP");
const nodemailer = require("nodemailer");
const userAuth = require("../middleware/userAuth");
const router = express.Router();

// POST route for user signup
router.post("/signup", async (req, res) => {
  const { name, age, gender, email, contact } = req.body;

  try {
    const existingEmail = await User.findOne({ email: email });

    if (existingEmail) {
      res.status(200).send({
        status: "Failed",
        message: "Email already registered",
      });
    } else {
      // Create new user instance
      const newUser = new User({
        name,
        age,
        gender,
        email,
        contact,
      });
      await newUser.save();

      const otp = generateOTP(4);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.NODEMAILER_EMAIL,
          pass: process.env.NODEMAILER_PASSWORD,
        },
      });

      const msg = {
        to: newUser.email,
        from: "demcare12@gmail.com",
        subject: "OTP for Registration",
        text: `Your OTP is: ${otp}`,
      };

      transporter
        .sendMail(msg)
        .then(async () => {
          const otpModel = {
            otp: otp,
            status: true,
            email: newUser.email,
          };
          const otpDb = new OtpModel(otpModel);
          const otpsave = await otpDb.save();

          setTimeout(async () => {
            const otpupdate = await OtpModel.findOneAndUpdate(
              { _id: otpsave._id },
              { otp: otp, status: false }
            );
          }, 100000);

          res.status(200).send({
            status: "Successful",
            message: "otp sent",
            otpId: otpsave._id,
          });
        })
        .catch((error) => {
          console.error(error);
          res.status(200).send({
            status: "Failed",
            message: "Failed to send OTP",
          });
        });
    }
  } catch (error) {
    // Handle error (e.g., if email already exists)
    console.error(error);
    res.status(500).send({
      status: "Failed",
      message: error.message,
    });
  }
});

// login function
router.post("/login", async (req, res) => {
  const userBody = req.body;

  if (userBody.email) {
    try {
      const user = await User.findOne({
        email: userBody.email,
      });

      if (user) {
        otp = generateOTP(4);
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD,
          },
        });

        const msg = {
          to: userBody.email,
          from: process.env.NODEMAILER_EMAIL,
          subject: "OTP for Login",
          text: `Your OTP is: ${otp}`,
        };

        transporter
          .sendMail(msg)
          .then(async () => {
            var otpModel = {
              otp: otp,
              status: true,
              email: user.email,
            };
            const otpDb = new OtpModel(otpModel);
            otpsave = await otpDb.save();
            setTimeout(async () => {
              const otpupdate = await OtpModel.findOneAndUpdate(
                { _id: otpsave._id },
                { otp: otp, status: false }
              );
            }, 100000);
            if (otpsave)
              res.status(200).send({
                status: "Successful",
                message: "otp sent",
                otpId: otpsave._id,
              });
            else
              res.send({
                status: "Failed",
                message: otpsave,
              });
          })
          .catch((error) => {
            console.error(error);
            res.status(200).send({
              status: "Failed",
              message: "Failed to send OTP",
            });
          });
      } else {
        res.status(200).send({
          status: "Failed",
          message: "No user found",
        });
      }
    } catch (err) {
      res.status(200).send({
        status: "Failed",
        message: err.message,
      });
    }
  } else {
    res.status(200).send({
      status: "Failed",
      message: "Enter valid email",
    });
  }
});

// otp-verification function
router.post("/otp-verify", async (req, res) => {
  const otp = req.body.otpEntered;
  const otpId = req.body.otpId;

  const otpDB = await OtpModel.findById(otpId);
  const email = otpDB.email;

  if (otpDB.otp == otp && otpDB.status) {
    const user = await User.findOne({ email: email });
    user.verified = true;
    await user.save();
    const token = await user.generateAuthToken();
    res.status(200).send({
      status: "Successful",
      user,
      token,
    });
  } else {
    console.log(otpDB.otp);
    console.log(otpDB.status);
    res.status(200).send({ status: "Failed", message: "Wrong OTP entered" });
  }
});

// Update emergency contacts function
router.post("/update-emergency-contacts", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const emergencyContacts = req.body.emergencyContacts;

    if (!Array.isArray(emergencyContacts) || emergencyContacts.length === 0) {
      return res
        .status(400)
        .send({ status: "Failed", message: "Invalid emergency contacts data" });
    }
    for (let contact of emergencyContacts) {
      if (!contact.contactName || !contact.contactNumber) {
        return res.status(400).send({
          status: "Failed",
          message: "Each contact must have a name and number",
        });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .send({ status: "Failed", message: "User not found" });
    }
    user.emergencyContacts = emergencyContacts;
    await user.save();
    res.status(200).send({
      status: "Successful",
      message: "Emergency contacts updated successfully",
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: "Failed", message: "Server error" });
  }
});

module.exports = router;
