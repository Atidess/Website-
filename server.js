app.post("/rank", (req, res) => {
    console.log("🔥 /rank WURDE AUFGERUFEN!");
    console.log("Daten:", req.body);

    res.json({
        success: true,
        message: "Rank API funktioniert!"
    });
});
