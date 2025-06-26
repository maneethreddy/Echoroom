const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("EchoRoom backend is alive!");
});
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);


const PORT = process.env.PORT || 8000;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ EchoRoom server running on port ${PORT}`);
    });
  })
  .catch((err) => console.log("Mongo Error:", err));
