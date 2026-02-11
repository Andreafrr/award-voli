export default async function handler(req, res) {

  try {

    const response = await fetch("https://example.com");
    const text = await response.text();

    res.status(200).json({
      message: "Server funzionante",
      pageLength: text.length
    });

  } catch (error) {
    res.status(500).json({
      error: "Non riesco a leggere la pagina"
    });
  }

}
