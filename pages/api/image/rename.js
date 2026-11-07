/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { BlobServiceClient } from "@azure/storage-blob"

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" })
	}

	const { container, oldName, newName } = req.body

	if (!container || !oldName || !newName) {
		return res.status(400).json({ error: "Missing container, oldName, or newName" })
	}

	if (oldName === newName) {
		return res.status(400).json({ error: "New name must be different from old name" })
	}

	// Validate filename doesn't have path traversal or illegal chars
	if (newName.includes("..") || newName.includes("\\") || !newName.trim()) {
		return res.status(400).json({ error: "Invalid file name" })
	}

	const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
	if (!connectionString) {
		return res.status(500).json({ error: "Azure Storage Connection String is missing" })
	}

	try {
		const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
		const containerClient = blobServiceClient.getContainerClient(container)

		const oldBlobClient = containerClient.getBlockBlobClient(oldName)
		const newBlobClient = containerClient.getBlockBlobClient(newName)

		// Check if old blob exists
		if (!(await oldBlobClient.exists())) {
			return res.status(404).json({ error: "Source blob not found" })
		}

		// Check if new blob already exists
		if (await newBlobClient.exists()) {
			return res.status(409).json({ error: "Destination blob already exists" })
		}

		// Copy blob from old to new
		await newBlobClient.beginCopyFromURL(oldBlobClient.url)

		// Wait for copy to complete
		let copyStatus = "pending"
		let attempts = 0
		while (copyStatus === "pending" && attempts < 30) {
			await new Promise((r) => setTimeout(r, 100))
			const props = await newBlobClient.getProperties()
			copyStatus = props.copyStatus
			attempts++
		}

		if (copyStatus !== "success") {
			return res.status(500).json({ error: "Copy operation failed" })
		}

		// Delete old blob
		await oldBlobClient.delete()

		return res.status(200).json({
			success: true,
			message: "File renamed successfully",
			newUrl: newBlobClient.url,
		})
	} catch (error) {
		console.error("Error renaming blob:", error.message)
		return res.status(500).json({ error: "Error renaming file" })
	}
}
