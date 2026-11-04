/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

import { EmailClient } from "@azure/communication-email"
import config from "@/config"

const escapeHtml = (value) =>
	value.replace(/[&<>"']/g, (character) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
	})[character])

export const sendEmail = async (to, subject, text, html, replyTo) => {
	if (
		typeof to !== "string" ||
		!to.trim() ||
		typeof subject !== "string" ||
		typeof text !== "string" ||
		typeof html !== "string" ||
		(replyTo !== undefined && typeof replyTo !== "string")
	) {
		throw new TypeError("Invalid email message")
	}

	const connectionString = process.env.AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING
	const senderAddress = process.env.AZURE_COMMUNICATION_SERVICES_SENDER_ADDRESS

	if (!connectionString || !senderAddress) {
		throw new Error("Azure Communication Email is not configured")
	}

	const emailMessage = {
		senderAddress,
		content: { subject, plainText: text, html },
		recipients: {
			to: [{ address: to.trim(), displayName: "Recipient" }],
		},
		...(replyTo && { replyTo: [{ address: replyTo }] }),
	}

	let result
	try {
		const emailClient = new EmailClient(connectionString)
		const poller = await emailClient.beginSend(emailMessage)
		result = await poller.pollUntilDone()
	} catch (error) {
		console.error("Azure Communication Email request failed", {
			code: error?.code,
			statusCode: error?.statusCode,
		})
		throw new Error("Azure Communication Email request failed")
	}

	if (!result || typeof result.status !== "string") {
		console.error("Azure Communication Email returned an invalid send result")
		throw new Error("Azure Communication Email returned an invalid send result")
	}

	if (result.status !== "Succeeded") {
		console.error("Azure Communication Email delivery failed", {
			status: result.status,
			errorCode: result.error?.code,
		})
		throw new Error("Azure Communication Email delivery failed")
	}
}

export const sendVerificationEmail = async ({ identifier, url }) => {
	const verificationUrl = new URL(url)
	if (verificationUrl.protocol !== "https:" && verificationUrl.protocol !== "http:") {
		throw new Error("Invalid email verification URL")
	}

	// Email sign-in links always land on the home page, regardless of the page that started sign-in
	verificationUrl.searchParams.set("callbackUrl", verificationUrl.origin)

	const brand = config.appName
	const safeBrand = escapeHtml(brand)
	const safeUrl = escapeHtml(verificationUrl.toString())

	await sendEmail(
		identifier,
		`Sign in to ${brand}`,
		`Sign in to ${brand} using this link:\n\n${verificationUrl.toString()}\n\nIf you did not request this email, you can safely ignore it.`,
		`<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#222">` +
			`<h2 style="margin:0 0 16px">${safeBrand}</h2>` +
			`<p>Sign in to <strong>${safeBrand}</strong> using the button below.</p>` +
			`<p><a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background:${config.colors.main};color:#fff;text-decoration:none;border-radius:6px">Sign in</a></p>` +
			`<p style="font-size:12px;color:#666">If you did not request this email, you can safely ignore it.</p></div>`
	)
}
