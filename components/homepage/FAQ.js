/* This file is part of the Twisted Artists Guild project.

 Copyright (C) 2025 Twisted Artists Guild

 Licensed under the GNU General Public License v3.0
 (https://www.gnu.org/licenses/gpl-3.0.en.html).

 This software comes with NO WARRANTY; see the license for details.

 Open source · low-profit · human-first*/

// <FAQ> component is a lsit of <Item> component
// Just import the FAQ & add your FAQ content to the const faqList

const faqList = [
	{
		question: "What is the Twisted Artists Guild (TAG) and who does it serve?",
		answer: (
			<div className="space-y-2 leading-relaxed">
				TAG is a dynamic B2B2C platform designed to bridge the gap between creative artists and appreciative art lovers. On one side, we empower independent artists and creative professionals by giving them a free, powerful space to showcase their portfolio, manage sales, and promote creative services and classes. On the other side, our art-loving public finds an aesthetic, easy-to-navigate marketplace to purchase unique art pieces, event tickets, merchandise, and exclusive classes. In short, TAG isn’t just an art gallery – it’s a full-service business manager that helps artists focus on creativity while we handle commerce, customer support, and reliable delivery.
			</div>
		),
	},
	{
		question: "How can I purchase art, tickets, or merchandise on TAG?",
		answer: (
			<div className="space-y-2 leading-relaxed">
				For our art-loving public, TAG is built with ease of use and beauty in mind. Once you visit our site, you’ll find curated listings that make finding your next art piece or event a breeze. Our streamlined checkout process guarantees timely delivery, and our customer support team is dedicated to smoothing out any issues – whether that’s tracking your order or handling special circumstances. Simply browse our intuitive marketplace and make your purchase with confidence, knowing that we stand behind every sale.
			</div>
		),
	},
	{
		question: "How do I register as an Artist Member and what benefits do I receive?",
		answer: (
			<div className="space-y-2 leading-relaxed">
				Becoming a TAG Artist Member is both free and empowering. Sign up at /artists/register/ to create your artist profile, where you can highlight your portfolio, link to your listings and events, and even showcase a timeline of your creative journey. Our platform is designed to be a business manager in your corner—providing you with tools such as a sales dashboard, CRM capabilities, event ticketing support, and even automated workflow forms to help streamline your day-to-day operations. Our goal is to reduce administrative burdens so you can focus on what you do best: creating art.
			</div>
		),
	},
	{
		question: "How does TAG ensure top-tier customer support for its buyers?",
		answer: (
			<div className="space-y-2 leading-relaxed">
				Our commitment to exceptional customer service underpins everything we do. For art buyers, TAG promises a hassle-free experience—from prompt shipping of art, tickets, and merchandise to proactive support if issues arise. Imagine having a live support system that intercepts last-minute inquiries (even those “Oops, when do doors open?” moments) and ensures you always get the information you need. And should any unforeseen circumstance occur (like an artist dealing with emergencies), we’re prepared with clear refund policies and resolution measures to keep you satisfied.
			</div>
		),
	},
	{
		question: "What are TAG’s pricing and fee structures?",
		answer: (
			<div className="space-y-2 leading-relaxed">
				For the most part, TAG is free for artists to set up their profiles and showcase their work. Our revenue model is based on a simple percentage fee on sales, helping us maintain and improve the platform while keeping access affordable. While there’s occasional discussion around introducing a nominal membership fee (projected at around $60 per year), our primary revenue remains a commission on successful transactions. This structure assures both artists and buyers that quality, transparency, and top-notch customer service remain our cornerstones.
			</div>
		),
	},
]

const Item = ({ item, defaultOpen = false }) => {
	return (
		<details open={defaultOpen}>
			<summary>
				{item?.question}
				<span className="tag-accordion__icon" aria-hidden="true" />
			</summary>
			<div className="tag-accordion__answer">{item?.answer}</div>
		</details>
	)
}

// Also used on /about/features
const FAQ = () => {
	return (
		<section className="tag-section tag-section--band" id="faq">
			<div className="tag-container">
				<div className="tag-section-head" data-reveal>
					<div className="tag-accent-bar" />
					<h2>Questions, answered</h2>
				</div>
				<div className="tag-accordion" data-reveal>
					{faqList.map((item, i) => (
						<Item key={item.question} item={item} defaultOpen={i === 0} />
					))}
				</div>
			</div>
		</section>
	)
}

export default FAQ
