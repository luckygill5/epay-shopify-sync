import { XMLParser } from 'fast-xml-parser';

export default async function handler(req, res) {
  try {
    const xmlString = req.body; // epay XML

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
    });

    const parsed = parser.parse(xmlString);

    // ✅ Return only parsed JSON
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
