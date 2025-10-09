<script lang="ts">
	import type { PageData } from './$types';
	
	let { data }: { data: PageData } = $props();
	
	// Redirect to projects if logged in, otherwise login page
	const ctaHref = data.user ? '/projects' : '/login';
	const ctaText = data.user ? 'Go to Projects' : 'Start Now';
</script>

<div class="landing">
	<section class="hero">
		<div class="hero-content">
			<h1 class="hero-title">
				Stay ahead with
				<span class="gradient-text">LuukAhead</span>
			</h1>
			<p class="hero-subtitle">
				Modern project management made simple. Organize your work, track progress, and collaborate 
				with your team—all in one place.
			</p>
			<a href={ctaHref} class="cta-button">
				{ctaText}
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="5" y1="12" x2="19" y2="12"></line>
					<polyline points="12 5 19 12 12 19"></polyline>
				</svg>
			</a>
		</div>
		
		<div class="hero-visual">
			<div class="card-stack">
				<div class="floating-card card-1">
					<div class="card-header">
						<div class="status-dot status-active"></div>
						<span>In Progress</span>
					</div>
					<div class="card-title">Website Redesign</div>
					<div class="card-progress">
						<div class="progress-bar" style="width: 65%"></div>
					</div>
				</div>
				<div class="floating-card card-2">
					<div class="card-header">
						<div class="status-dot status-done"></div>
						<span>Completed</span>
					</div>
					<div class="card-title">API Integration</div>
					<div class="card-progress">
						<div class="progress-bar full" style="width: 100%"></div>
					</div>
				</div>
				<div class="floating-card card-3">
					<div class="card-header">
						<div class="status-dot status-pending"></div>
						<span>To Do</span>
					</div>
					<div class="card-title">Mobile App</div>
					<div class="card-progress">
						<div class="progress-bar" style="width: 20%"></div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section class="features">
		<h2 class="section-title">Everything you need to stay organized</h2>
		<div class="features-grid">
			<div class="feature-card">
				<div class="feature-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
						<polyline points="9 22 9 12 15 12 15 22"></polyline>
					</svg>
				</div>
				<h3>Project Management</h3>
				<p>Organize tasks, set priorities, and track progress across all your projects in one centralized hub.</p>
			</div>
			
			<div class="feature-card">
				<div class="feature-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
						<line x1="9" y1="3" x2="9" y2="21"></line>
					</svg>
				</div>
				<h3>Flexible Workflows</h3>
				<p>Customize item types, priorities, and statuses to match your unique workflow and team processes.</p>
			</div>
			
			<div class="feature-card">
				<div class="feature-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
					</svg>
				</div>
				<h3>Lightning Fast</h3>
				<p>Built on modern technology for instant updates and smooth performance, even with large projects.</p>
			</div>
			
			<div class="feature-card">
				<div class="feature-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
					</svg>
				</div>
				<h3>Secure & Private</h3>
				<p>Your data is encrypted and stored securely. We take privacy seriously and never share your information.</p>
			</div>
		</div>
	</section>

	<section class="cta-section">
		<div class="cta-content">
			<h2>Ready to get ahead?</h2>
			<p>Join thousands of teams already managing their projects more effectively.</p>
			<a href={ctaHref} class="cta-button secondary">
				{ctaText}
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="5" y1="12" x2="19" y2="12"></line>
					<polyline points="12 5 19 12 12 19"></polyline>
				</svg>
			</a>
		</div>
	</section>
</div>

<style>
	.hero {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6rem;
		align-items: center;
		padding: 8rem 3rem;
		max-width: 1400px;
		margin: 0 auto;
		min-height: calc(100vh - 8rem);
	}

	.hero-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.hero-title {
		font-size: 3.5rem;
		font-weight: 800;
		line-height: 1.1;
		margin: 0;
		color: var(--light-100);
	}

	.gradient-text {
		background: linear-gradient(135deg, var(--primary-400) 0%, var(--primary-600) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero-subtitle {
		font-size: 1.25rem;
		line-height: 1.6;
		color: var(--light-400);
		margin: 0;
	}

	.cta-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 2rem;
		background: var(--primary-500);
		color: white;
		text-decoration: none;
		border-radius: 12px;
		font-weight: 600;
		font-size: 1.1rem;
		transition: all 0.3s ease;
		box-shadow: 0 4px 14px rgba(33, 150, 243, 0.3);
		align-self: flex-start;
	}

	.cta-button:hover {
		background: var(--primary-600);
		box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
		transform: translateY(-2px);
	}

	.cta-button svg {
		transition: transform 0.3s ease;
	}

	.cta-button:hover svg {
		transform: translateX(4px);
	}

	.hero-visual {
		position: relative;
		height: 500px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-stack {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.floating-card {
		position: absolute;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%);
		border-radius: 20px;
		padding: 1.5rem;
		box-shadow: 
			0 20px 60px rgba(0, 0, 0, 0.15),
			0 0 1px rgba(0, 0, 0, 0.1);
		width: 280px;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		backdrop-filter: blur(10px);
	}

	.floating-card:hover {
		transform: translateY(-12px) scale(1.02) !important;
		box-shadow: 
			0 30px 80px rgba(0, 0, 0, 0.2),
			0 0 1px rgba(0, 0, 0, 0.1);
	}

	.card-1 {
		top: 10%;
		left: 10%;
		transform: rotate(-5deg);
		z-index: 3;
	}

	.card-2 {
		top: 35%;
		right: 5%;
		transform: rotate(3deg);
		z-index: 2;
	}

	.card-3 {
		bottom: 10%;
		left: 15%;
		transform: rotate(-2deg);
		z-index: 1;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
		font-size: 0.875rem;
		color: var(--dark-600);
		font-weight: 500;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.status-active {
		background: var(--primary-500);
		box-shadow: 0 0 8px rgba(33, 150, 243, 0.5);
	}

	.status-done {
		background: var(--green-500);
		box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
	}

	.status-pending {
		background: var(--yellow-500);
		box-shadow: 0 0 8px rgba(255, 193, 7, 0.5);
	}

	.card-title {
		font-weight: 600;
		font-size: 1.1rem;
		margin-bottom: 1rem;
		color: var(--dark-800);
	}

	.card-progress {
		background: var(--light-200);
		height: 6px;
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background: linear-gradient(90deg, var(--primary-400), var(--primary-600));
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.progress-bar.full {
		background: linear-gradient(90deg, var(--green-400), var(--green-600));
	}

	.features {
		padding: 8rem 3rem;
		background: 
			radial-gradient(ellipse at center, rgba(33, 150, 243, 0.04) 0%, transparent 70%),
			var(--background);
		position: relative;
	}

	.features::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(33, 150, 243, 0.2), transparent);
	}

	.section-title {
		text-align: center;
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 5rem 0;
		color: var(--light-100);
		position: relative;
	}

	.section-title::after {
		content: '';
		position: absolute;
		bottom: -1.5rem;
		left: 50%;
		transform: translateX(-50%);
		width: 80px;
		height: 4px;
		background: linear-gradient(90deg, var(--primary-500), var(--primary-700));
		border-radius: 2px;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 3rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.feature-card {
		background: 
			linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%),
			var(--card);
		padding: 2.5rem;
		border-radius: 24px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		box-shadow: 
			0 10px 40px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		overflow: hidden;
	}

	.feature-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(33, 150, 243, 0.3), transparent);
		opacity: 0;
		transition: opacity 0.4s ease;
	}

	.feature-card:hover {
		transform: translateY(-8px);
		box-shadow: 
			0 20px 60px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		border-color: rgba(33, 150, 243, 0.3);
	}

	.feature-card:hover::before {
		opacity: 1;
	}

	.feature-icon {
		width: 64px;
		height: 64px;
		background: 
			linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(33, 150, 243, 0.08) 100%),
			rgba(33, 150, 243, 0.05);
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.5rem;
		color: var(--primary-400);
		box-shadow: 
			0 8px 24px rgba(33, 150, 243, 0.15),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(33, 150, 243, 0.2);
		transition: all 0.4s ease;
	}

	.feature-card:hover .feature-icon {
		transform: scale(1.05);
		box-shadow: 
			0 12px 32px rgba(33, 150, 243, 0.25),
			inset 0 1px 0 rgba(255, 255, 255, 0.15);
	}

	.feature-card h3 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 0.75rem 0;
		color: var(--light-100);
	}

	.feature-card p {
		margin: 0;
		line-height: 1.6;
		color: var(--light-400);
	}

	.cta-section {
		padding: 8rem 3rem;
		background: 
			linear-gradient(135deg, rgba(33, 150, 243, 0.95) 0%, rgba(25, 118, 210, 0.98) 100%),
			linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.05) 100%);
		color: white;
		position: relative;
		overflow: hidden;
	}

	.cta-section::before {
		content: '';
		position: absolute;
		top: -50%;
		right: -20%;
		width: 600px;
		height: 600px;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
		border-radius: 50%;
		pointer-events: none;
	}

	.cta-section::after {
		content: '';
		position: absolute;
		bottom: -30%;
		left: -10%;
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
		border-radius: 50%;
		pointer-events: none;
	}

	.cta-content {
		max-width: 800px;
		margin: 0 auto;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		position: relative;
		z-index: 1;
	}

	.cta-content h2 {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0;
	}

	.cta-content p {
		font-size: 1.25rem;
		margin: 0;
		opacity: 0.95;
	}

	.cta-button.secondary {
		background: rgba(255, 255, 255, 0.95);
		color: var(--primary-600);
		box-shadow: 
			0 8px 24px rgba(0, 0, 0, 0.2),
			inset 0 1px 0 rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(10px);
	}

	.cta-button.secondary:hover {
		background: white;
		box-shadow: 
			0 12px 32px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.6);
	}

	@media (max-width: 968px) {
		.hero {
			grid-template-columns: 1fr;
			padding: 4rem 2rem;
			gap: 4rem;
		}

		.hero-title {
			font-size: 2.5rem;
		}

		.hero-visual {
			height: 400px;
		}

		.floating-card {
			width: 240px;
		}

		.features {
			padding: 6rem 2rem;
		}

		.features-grid {
			gap: 2rem;
		}

		.cta-section {
			padding: 6rem 2rem;
		}
	}

	@media (max-width: 640px) {
		.hero-title {
			font-size: 2rem;
		}

		.hero-subtitle {
			font-size: 1.1rem;
		}

		.section-title {
			font-size: 2rem;
		}

		.cta-content h2 {
			font-size: 2rem;
		}

		.cta-content p {
			font-size: 1.1rem;
		}

		.hero-visual {
			height: 350px;
		}

		.floating-card {
			width: 200px;
			padding: 1rem;
		}

		.card-title {
			font-size: 1rem;
		}
	}
</style>
