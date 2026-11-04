import Head from "next/head"
import config from "@/config"

export default function VerifyRequest() {
	return (
		<>
			<Head>
				<title>{`Check your email | ${config.appName}`}</title>
				<meta name="robots" content="noindex" />
			</Head>
			<main className="min-h-screen flex items-center justify-center p-6">
				<div className="card bg-base-100 shadow-xl max-w-md w-full text-center">
					<div className="card-body items-center">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src="/TAG%20OFFICIAL/LOGOS/TAG%20(FILLED).png"
							alt={`${config.appName} logo`}
							width={96}
							height={96}
						/>
						<h1 className="card-title">Check your email</h1>
						<p>A sign-in link has been sent to your email address for {config.appName}.</p>
					</div>
				</div>
			</main>
		</>
	)
}
