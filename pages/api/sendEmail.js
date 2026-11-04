/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/


import { sendEmail } from "@/libs/azure-email"

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed." })
	}

	const { to, subject, text, html, replyTo } = req.body || {}
	try {
		await sendEmail(to, subject, text, html, replyTo)
		return res.status(200).json({ message: "Email sent successfully!" })
	} catch (error) {
		if (error instanceof TypeError) {
			return res.status(400).json({ error: "Invalid email message." })
		}

		console.error("Email API request failed:", error?.message)
		return res.status(500).json({ error: "Failed to send email." })
	}
}
