app.post("/streamlabs", async (req, res) => {
  const data = req.body;

  console.log("WEBHOOK :", JSON.stringify(data, null, 2));

  if (data.type === "subscription") {
    const name = data.message[0].name;

    console.log("NOUVEL ABO :", name);

    await updateYoutubeTitle(name);
  }

  res.sendStatus(200);
});
