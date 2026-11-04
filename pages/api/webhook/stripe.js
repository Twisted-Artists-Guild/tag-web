/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/


import Stripe from "stripe"
import { buffer } from "micro"
import { sendEmail } from "@/libs/azure-email"
import configFile from "@/config"
import { findCheckoutSession } from "@/libs/stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export const config = {
	api: {
		bodyParser: false,
	},
}

export default async function handler(req, res) {
	const { method } = req

	switch (method) {
	case "POST": {
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
		const buf = await buffer(req)
		let data
		let eventType
		let eventId

		if (webhookSecret) {
			let event
			const signature = req.headers["stripe-signature"]

			// verify Stripe event is legit
			try {
				event = stripe.webhooks.constructEvent(buf, signature, webhookSecret)
			} catch (err) {
				console.error(`Webhook signature verification failed. ${err.message}`)
				return res.status(400).send()
			}
			data = event.data
			eventType = event.type
			eventId = event.id
		} else {
			data = req.body.data
			eventType = req.body.type
			eventId = req.body.id || data?.object?.id
		}

		try {
			switch (eventType) {
			case "checkout.session.completed": {
				// First payment is successful and the subscription is created | or the subscription was canceled so create new one

				const session = await findCheckoutSession(data.object.id)

				const customerId = session?.customer
				const priceId = session?.line_items?.data[0]?.price.id
				const userId = data.object.client_reference_id
				const plan = configFile.stripe.plans.find((p) => p.priceId === priceId)

				if (!plan) break

				const customer = await stripe.customers.retrieve(customerId)

				let user

				// Get or create the user. userId is normally pass in the checkout session (clientReferenceID) to identify the user when we get the webhook event
				if (userId) {
					const userRes = await fetch(`/api/users/${userId}`)
					user = await userRes.json()
				} else if (customer.email) {
					const userRes = await fetch(`/api/users?email=${customer.email}`)
					const users = await userRes.json()
					user = users[0]

					if (!user) {
						const createUserRes = await fetch(`/api/users`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								email: customer.email,
								name: customer.name,
							}),
						})
						user = await createUserRes.json()
					}
				} else {
					console.error("No user found")
					throw new Error("No user found")
				}

				// update user data (for instance add credits)
				await fetch(`/api/users/${user.id}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						priceId: priceId,
						customerId: customerId,
					}),
				})

				// Prototype ledger posting for Modern Treasury integration
				try {
					const amountTotalCents = session?.amount_total || 0
					const amountTaxCents = session?.total_details?.amount_tax || 0
					const shippingRevenueCents = session?.total_details?.amount_shipping || 0

					await fetch(`/api/treasury/stripe-event`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							stripeEventId: eventId || session.id,
							stripeEventType: eventType,
							stripePaymentIntentId: session?.payment_intent || null,
							orderId: session.id,
							amountTotalCents: amountTotalCents,
							platformFeeCents: 0,
							amountShippingCents: shippingRevenueCents,
							amountTaxCents: amountTaxCents,
							stripeFeeCents: 0,
							shippingCostCents: 0,
							sellerType: "artist",
							currency: (session?.currency || "usd").toUpperCase(),
							description: `Stripe checkout ${session.id}`,
							dryRun: (process.env.MODERN_TREASURY_DRY_RUN || "true") !== "false",
						}),
					})
				} catch (ledgerError) {
					console.error("Modern Treasury ledger post failed:", ledgerError?.message || ledgerError)
				}

				// Send email with user link, product page, etc...
				try {
					await sendEmail(
						user.email,
						"Subscription Successful",
						`Hello ${user.name},\n\nYour subscription to ${plan.name} has been successfully created.`,
						`<p>Hello ${user.name},</p><p>Your subscription to ${plan.name} has been successfully created.</p>`
					)
				} catch (e) {
					console.error("Email issue:" + e?.message)
				}

				break
			}
			case "checkout.session.expired": {
				// User didn't complete the transaction
				// Can send an email to the user to remind him to complete the transaction, for instance
				break
			}

			case "customer.subscription.updated": {
				// The customer might have changed the plan.

				await stripe.subscriptions.retrieve(data.object.id)
				// Do any operation here
				break
			}

			case "customer.subscription.deleted": {
				// The customer stopped the subscription.
				break
			}

			default:
            // Unhandled event type
			}
		} catch (e) {
			console.error("stripe error: ", e.message)
		}

		return res.status(200).send()
	}
	default:
		return res.status(200).send()
	}
}
