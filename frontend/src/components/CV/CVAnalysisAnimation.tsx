"use client";

import React from 'react';

interface Props {
	size?: number; // px for icon
}

// Lightweight CSS-only Gemini-like badge for environments where framer-motion
// or other libs are not available. Keeps build simple and avoids extra deps.
const CVAnalysisAnimation: React.FC<Props> = ({ size = 20 }) => {
	const ringSize = size;
	const badgeSize = Math.round(size * 0.7);

	const ringStyle: React.CSSProperties = {
		width: ringSize,
		height: ringSize,
		display: 'inline-block',
		marginRight: 6,
	};

	const badgeStyle: React.CSSProperties = {
		marginLeft: -ringSize * 0.5,
		width: badgeSize,
		height: badgeSize,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 9999,
		background: 'linear-gradient(135deg,#a78bfa,#06b6d4)',
		boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
		animation: 'cv-badge-pulse 1.6s ease-in-out infinite'
	};

	return (
		<span style={{ display: 'inline-flex', alignItems: 'center' }}>
			<svg style={ringStyle} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<linearGradient id="g1" x1="0%" x2="100%">
						<stop offset="0%" stopColor="#4f46e5" />
						<stop offset="100%" stopColor="#06b6d4" />
					</linearGradient>
				</defs>
				<circle cx="24" cy="24" r="18" stroke="rgba(0,0,0,0.06)" strokeWidth="4" fill="none" />
				<path d="M6 24a18 18 0 0 1 18-18" stroke="url(#g1)" strokeWidth="4" strokeLinecap="round" fill="none">
					<animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="1.6s" repeatCount="indefinite" />
				</path>
			</svg>

			<span style={badgeStyle} aria-hidden>
				<svg width="65%" height="65%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M7 7h6a3 3 0 010 6H7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
					<path d="M13 11h4a3 3 0 100-6h-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</span>

			<style>{`\n        @keyframes cv-badge-pulse {\n          0% { transform: scale(0.95); opacity: 0.9 }\n          50% { transform: scale(1.05); opacity: 1 }\n          100% { transform: scale(1); opacity: 0.95 }\n        }\n      `}</style>
		</span>
	);
};

export default CVAnalysisAnimation;

