import { useState, useMemo, FC, useEffect } from 'react';
import styles from '../../styles/Contributors.module.css';
import projectsStyles from '../../styles/Projects.module.css';
import projectStyles from '../../styles/ProjectDetail.module.css';
import carouselStyles from '../../styles/MeshSDKComponents.module.css';
import meshStatsStyles from '../../styles/MeshStats.module.css';
import PageHeader from '../../components/PageHeader';
import Link from 'next/link';
import { FaArrowLeft, FaCalendarAlt } from 'react-icons/fa';
import MeshSDKCarousel from '../../components/MeshSDKCarousel';
import MeshSDKArchitectureChart from '../../components/MeshSDKArchitectureChart';
import { useData } from '../../contexts/DataContext';
import MeshSdkContributorsChart from '../../components/MeshSdkContributorsChart';
import MeshRepositoriesEvolutionChart from '../../components/MeshRepositoriesEvolutionChart';
import MeshSDKProposalCard from '../../components/MeshSDKProposalCard';
import { Contributor, ContributorRepository, CatalystProject } from '../../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
} from 'recharts';

// Time window presets
const TIME_WINDOW_PRESETS = [
  { label: 'All time', value: 'all' },
  { label: 'Last year', value: '1y' },
  { label: 'Last 6 months', value: '6m' },
  { label: 'Last 3 months', value: '3m' },
  { label: 'Last 30 days', value: '30d' },
];

// Format number with commas
const formatNumber = (num: number | undefined): string => {
  if (num === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(num);
};

// Custom tooltip for the bar chart
const CustomTooltip: FC<TooltipProps<number, string> & { chartId?: string }> = ({
  active,
  payload,
  label,
  chartId,
}) => {
  if (active && payload && payload.length && payload[0].value !== undefined) {
    return (
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
          maxWidth: '280px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(0, 0, 0, 0.8)',
            marginBottom: '6px',
            fontWeight: '600',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
            paddingBottom: '3px',
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '16px' }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '1px',
                backgroundColor: '#000000',
                boxShadow: '0 0 3px rgba(0, 0, 0, 0.3)',
              }}
            />
            <span style={{ color: 'rgba(0, 0, 0, 0.9)', fontWeight: '500' }}>downloads</span>
          </div>
          <span
            style={{
              color: 'rgba(0, 0, 0, 0.9)',
              fontWeight: '600',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {formatNumber(payload[0].value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Custom tick component for the bar chart
const CustomTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="rgba(0, 0, 0, 0.6)"
        fontSize="9"
        transform="rotate(-60)"
      >
        {payload.value}
      </text>
    </g>
  );
};

// Custom bar chart component
interface CustomBarChartProps {
  data: Array<{
    name: string;
    downloads: number;
  }>;
  chartId: string;
}

const CustomBarChart: FC<CustomBarChartProps> = ({ data, chartId }) => {
  const gradientId = `whiteGradient-${chartId}`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        barGap={8}
        margin={{ top: 10, right: 10, left: -15, bottom: 75 }}
        key={`bar-chart-${chartId}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000000" />
            <stop offset="100%" stopColor="#4a5568" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" vertical={false} />
        <XAxis
          dataKey="name"
          axisLine={{ stroke: 'rgba(0, 0, 0, 0.1)' }}
          tick={<CustomTick />}
          tickLine={{ stroke: 'rgba(0, 0, 0, 0.1)' }}
          height={80}
          interval={0}
          tickMargin={8}
        />
        <YAxis
          axisLine={{ stroke: 'rgba(0, 0, 0, 0.1)' }}
          tick={{ fill: 'rgba(0, 0, 0, 0.6)', fontSize: 11 }}
          tickLine={{ stroke: 'rgba(0, 0, 0, 0.1)' }}
          tickFormatter={value => (value >= 1000 ? `${value / 1000}k` : value)}
        />
        <Tooltip
          content={<CustomTooltip chartId={chartId} />}
          cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
        />
        <Bar
          dataKey="downloads"
          fill={`url(#${gradientId})`}
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
          animationBegin={150}
          animationDuration={1200}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Entry-point packages only — excludes transitive deps to avoid double-counting
const MESH_SDK_ENTRY_PACKAGES = ['@meshsdk/core', '@meshsdk/react', '@meshsdk/contract'];

// Calculate download metrics using entry-point packages only (excluding web3-sdk)
const calculateAggregatedMetrics = (meshPackagesData: any) => {
  if (!meshPackagesData?.packages) {
    return {
      lastWeek: 0,
      lastMonth: 0,
      lastYear: 0,
      allTime: 0,
    };
  }

  let lastWeek = 0;
  let lastMonth = 0;
  let last12Months = 0;
  let allTime = 0;

  // Only count entry-point packages to avoid double-counting transitive dependencies
  meshPackagesData.packages
    .filter((pkg: any) => MESH_SDK_ENTRY_PACKAGES.includes(pkg.name))
    .forEach((pkg: any) => {
      // Use API fields for recent periods (more reliable)
      lastWeek += pkg.last_week_downloads || 0;
      lastMonth += pkg.last_month_downloads || 0;
      last12Months += pkg.last_12_months_downloads || 0;

      // Calculate true all-time from monthly_downloads data
      if (pkg.monthly_downloads && Array.isArray(pkg.monthly_downloads)) {
        const packageAllTime = pkg.monthly_downloads.reduce((sum: number, monthData: any) => {
          return sum + (monthData.downloads || 0);
        }, 0);
        allTime += packageAllTime;
      }
    });

  // Validation: All-time should be >= 12 months (if not, monthly data might be incomplete)
  if (allTime < last12Months) {
    console.warn('All-time downloads appear incomplete. Using 12-month data as minimum.');
    allTime = last12Months;
  }

  return {
    lastWeek,
    lastMonth,
    lastYear: last12Months,
    allTime,
  };
};

// Function to get monthly download data — full timeline of completed months
const getMonthlyDownloadData = (meshPackagesData: any) => {
  if (!meshPackagesData?.packages) return [];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyTotals: Record<string, number> = {};

  // Aggregate downloads from entry-point packages across all completed months
  meshPackagesData.packages
    .filter((pkg: any) => MESH_SDK_ENTRY_PACKAGES.includes(pkg.name))
    .forEach((pkg: any) => {
      if (pkg.monthly_downloads) {
        pkg.monthly_downloads
          .filter((m: any) => m.year < currentYear || (m.year === currentYear && m.month < currentMonth))
          .forEach((m: any) => {
            const key = `${m.year}-${String(m.month).padStart(2, '0')}`;
            monthlyTotals[key] = (monthlyTotals[key] || 0) + (m.downloads || 0);
          });
      }
    });

  // Convert to sorted array
  return Object.entries(monthlyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, downloads]) => {
      const [year, month] = key.split('-');
      return {
        name: `${shortMonths[parseInt(month) - 1]} ${year}`,
        downloads,
      };
    });
};

// Filter contributors to only include those who contributed to Mesh SDK repositories
const filterMeshSdkContributors = (contributors: Contributor[], startDate: string | null = null, endDate: string | null = null) => {
  // List of Mesh SDK repositories - excluding web3-sdk as requested
  const meshSdkRepos = [
    'mesh',
    'core',
    'docs',
    'starter-templates',
    'wallet-connectors',
    'mesh-js.github.io',
    'mesh-playground',
    'mesh-react-playground',
    'mesh-vite-react-starter',
    'mesh-next-starter',
    'mesh-cra-starter',
    'mesh-react-native-starter',
    'mesh-vue-starter',
    'mesh-nuxt-starter',
    'mesh-svelte-starter',
    'mesh-astro-starter',
    'mesh-remix-starter',
    'mesh-gatsby-starter',
    'mesh-angular-starter',
    'mesh-solid-starter',
    'mesh-qwik-starter',
    'mesh-cli',
    'mesh-tools',
    'mesh-examples',
  ];
  
  // Explicitly exclude these repositories
  const excludedRepos = [
    'web3-sdk',
    'web3-services'
  ];

  // Filter contributors who have contributed to Mesh SDK repos but not only to excluded repos
  return contributors
    .map(contributor => {
      // Create a new contributor object with only Mesh SDK repositories
      const meshSdkContributions = contributor.repositories.filter(repo => {
        const repoName = repo.name.toLowerCase();
        
        // Check if the repository is a Mesh SDK repo and not an excluded repo
        const isExcluded = excludedRepos.some(excludedRepo => 
          repoName.includes(excludedRepo.toLowerCase())
        );
        
        const isMeshSdkRepo = meshSdkRepos.some(meshRepo => 
          repoName.includes(meshRepo.toLowerCase())
        );
        
        return isMeshSdkRepo && !isExcluded;
      });
      
      // Filter timestamps by time window if provided
      const filteredRepos = meshSdkContributions.map(repo => {
        // If no time window is specified, use all timestamps
        if (!startDate && !endDate) {
          return repo;
        }
        
        // Helper function to check if timestamp is in range
        const checkTimestampInRange = (timestamp: string) => {
          if (!startDate && !endDate) return true;
          
          const date = new Date(timestamp);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;
          
          // For end date, include the entire day
          if (end) {
            end.setHours(23, 59, 59, 999);
          }
          
          return (!start || date >= start) && (!end || date <= end);
        };
        
        // Filter commit timestamps
        const filteredCommitTimestamps = repo.commit_timestamps.filter(checkTimestampInRange);
        
        // Filter PR timestamps
        const filteredPrTimestamps = repo.pr_timestamps.filter(checkTimestampInRange);
        
        // Return repo with filtered timestamps
        return {
          ...repo,
          commit_timestamps: filteredCommitTimestamps,
          pr_timestamps: filteredPrTimestamps,
          commits: filteredCommitTimestamps.length,
          pull_requests: filteredPrTimestamps.length,
          contributions: filteredCommitTimestamps.length + filteredPrTimestamps.length
        };
      });
      
      // Calculate total contributions, commits, and PRs
      const totalCommits = filteredRepos.reduce((total, repo) => total + repo.commits, 0);
      const totalPRs = filteredRepos.reduce((total, repo) => total + repo.pull_requests, 0);
      const totalContributions = totalCommits + totalPRs;
      
      // Return a new contributor object with only filtered Mesh SDK repositories
      return {
        ...contributor,
        repositories: filteredRepos,
        commits: totalCommits,
        pull_requests: totalPRs,
        contributions: totalContributions
      };
    })
    // Only include contributors who have contributed to Mesh SDK repos within the time window
    .filter(contributor => 
      contributor.repositories.length > 0 && 
      contributor.contributions > 0
    )
    // Sort by total contributions
    .sort((a, b) => b.contributions - a.contributions);
};

interface TimeWindow {
  startDate: string | null;
  endDate: string | null;
  preset: string;
}

export default function MeshSDKProject() {
  const { meshData, contributorStats, catalystData, loadContributorStats } = useData();
  // Always initialize with the core node highlighted
  const [highlightedNodeId, setHighlightedNodeId] = useState<string>('core');
  const [isUpdatingFromChart, setIsUpdatingFromChart] = useState(false);
  // Time window state
  const [timeWindow, setTimeWindow] = useState<TimeWindow>({
    startDate: null,
    endDate: null,
    preset: 'all', // Default to "All time"
  });
  
  // Load contributor stats when component mounts
  useEffect(() => {
    loadContributorStats();
  }, [loadContributorStats]);
  
  // Filter and order Mesh SDK related proposals
  const meshSdkProposals = useMemo(() => {
    if (!catalystData?.catalystData?.projects) return [];
    
    // Project IDs for Mesh SDK related proposals in the desired order
    const orderedMeshSdkProjectIds = ['1000107', '1100271', '1200147', '1200220', '1300130', '1400080'];
    
    // Filter projects that match our IDs
    const filteredProjects = catalystData.catalystData.projects.filter((project: CatalystProject) => 
      orderedMeshSdkProjectIds.includes(project.projectDetails.project_id)
    );
    
    // Sort projects according to our specified order
    return filteredProjects.sort((a, b) => {
      const indexA = orderedMeshSdkProjectIds.indexOf(a.projectDetails.project_id);
      const indexB = orderedMeshSdkProjectIds.indexOf(b.projectDetails.project_id);
      return indexA - indexB;
    });
  }, [catalystData]);
  
  // Check if a timestamp falls within the given date range
  const isTimestampInRange = (timestamp: string, startDate: string | null, endDate: string | null): boolean => {
    if (!startDate && !endDate) return true;
    
    const date = new Date(timestamp);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // For end date, include the entire day
    if (end) {
      end.setHours(23, 59, 59, 999);
    }
    
    return (!start || date >= start) && (!end || date <= end);
  };
  
  // Calculate global earliest contribution date across all contributors
  const globalEarliestDate = useMemo(() => {
    if (!contributorStats?.contributors) return null;
    let earliestDate: string | null = null;
    contributorStats.contributors.forEach((contributor: Contributor) => {
      contributor.repositories.forEach((repo: ContributorRepository) => {
        const allTimestamps = [...repo.commit_timestamps, ...repo.pr_timestamps];
        allTimestamps.forEach(timestamp => {
          if (!earliestDate || timestamp < earliestDate) {
            earliestDate = timestamp;
          }
        });
      });
    });
    return earliestDate;
  }, [contributorStats]);
  
  // Calculate time window boundaries based on preset
  const timeWindowBoundaries = useMemo(() => {
    if (timeWindow.preset === 'all') {
      return {
        startDate: null, // No filtering for "all time"
        endDate: null,
      };
    }

    // Calculate preset boundaries
    const now = new Date();
    const startDate = new Date(now);

    switch (timeWindow.preset) {
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '3m':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return {
          startDate: globalEarliestDate,
          endDate: null,
        };
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  }, [timeWindow, globalEarliestDate]);
  
  // Handle time window preset change
  const handleTimeWindowPresetChange = (preset: string) => {
    setTimeWindow(prev => ({
      ...prev,
      preset,
    }));
  };
  
  // Handler for carousel changes
  const handleCarouselChange = (nodeId: string) => {
    if (!isUpdatingFromChart) {
      setHighlightedNodeId(nodeId);
    }
  };
  
  // Handler for architecture chart node clicks
  const handleChartNodeClick = (nodeId: string) => {
    setIsUpdatingFromChart(true);
    setHighlightedNodeId(nodeId);
    // Reset flag after a short delay
    setTimeout(() => {
      setIsUpdatingFromChart(false);
    }, 100);
  };
  
  return (
    <div className={projectStyles.container}>
      <Link href="/projects" className={projectStyles.backLink}>
        <FaArrowLeft size={14} />
        <span>Back to Projects</span>
      </Link>
      
      <PageHeader
        title="Mesh SDK"
        subtitle="Collection of comprehensive TypeScript libraries for blockchain development on Cardano"
      />
      
      <div className={projectStyles.content}>
        <div style={{ marginBottom: '80px' }}>
          <div className={carouselStyles.carouselHeader}>
            <h2 className={carouselStyles.carouselTitle}>Mesh SDK Packages</h2>
            <p className={carouselStyles.carouselSubtitle}>
              Explore the various packages that make up the Mesh SDK ecosystem
            </p>
          </div>
          
          <MeshSDKCarousel
            onNodeSelect={handleCarouselChange}
            meshPackagesData={meshData?.meshPackagesData}
            highlightedNodeId={highlightedNodeId}
          />

          <div className={projectStyles.sectionDivider} />

          <div className={carouselStyles.carouselHeader}>
            <h2 className={carouselStyles.carouselTitle}>Architecture Overview</h2>
            <p className={carouselStyles.carouselSubtitle}>
              Visual representation of how Mesh SDK components interact with each other
            </p>
          </div>

          <MeshSDKArchitectureChart
            height={700}
            highlightedNodeId={highlightedNodeId}
            onNodeClick={handleChartNodeClick}
          />
        </div>
        
        {/* Mesh SDK Usage section with white vertical bar */}
        <div style={{ marginTop: '40px', marginBottom: '80px' }}>
          <div className={carouselStyles.carouselHeader}>
            <h2 className={carouselStyles.carouselTitle}>Mesh SDK Usage</h2>
            <p className={carouselStyles.carouselSubtitle}>
              Tracking active usage of the Mesh SDK packages
            </p>
          </div>
          
          {/* Metrics from mesh-stats page */}
          {meshData?.meshPackagesData && (
            <div className={meshStatsStyles.statsGrid}>
              <div className={meshStatsStyles.stat}>
                <h3>Last Week</h3>
                <p>{formatNumber(calculateAggregatedMetrics(meshData.meshPackagesData).lastWeek)}</p>
              </div>
              <div className={meshStatsStyles.stat}>
                <h3>Last Month</h3>
                <p>{formatNumber(calculateAggregatedMetrics(meshData.meshPackagesData).lastMonth)}</p>
              </div>
              <div className={meshStatsStyles.stat}>
                <h3>Last 12 Months</h3>
                <p>{formatNumber(calculateAggregatedMetrics(meshData.meshPackagesData).lastYear)}</p>
              </div>
              <div className={meshStatsStyles.stat}>
                <h3>All Time</h3>
                <p>{formatNumber(calculateAggregatedMetrics(meshData.meshPackagesData).allTime)}</p>
              </div>
            </div>
          )}

          {/* Charts from mesh-stats page */}
          <div className={meshStatsStyles.chartsContainer}>
            {meshData?.meshPackagesData && (
              <div className={meshStatsStyles.chartsGrid}>
                <div className={meshStatsStyles.chartSection}>
                  <h3 className={meshStatsStyles.chartTitle}>Monthly Downloads</h3>
                  <div className={meshStatsStyles.chart} style={{ height: '520px' }}>
                    <CustomBarChart
                      data={getMonthlyDownloadData(meshData.meshPackagesData)}
                      chartId="monthly"
                    />
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
        
        {/* Contributors section with teal vertical bar */}
          <div style={{ marginTop: '40px' }}>
            <div className={carouselStyles.carouselHeader}>
              <h2 className={carouselStyles.carouselTitle}>Contributors</h2>
              <p className={carouselStyles.carouselSubtitle}>
                The people behind Mesh SDK development
              </p>
            </div>
            
            {/* Contributors Metrics - Updates based on time window */}
            {contributorStats?.contributors && (
              <div className={meshStatsStyles.statsGrid} style={{ marginTop: '20px' }}>
                <div className={meshStatsStyles.stat}>
                  <h3>Contributors</h3>
                  <p>{filterMeshSdkContributors(contributorStats.contributors, timeWindowBoundaries.startDate, timeWindowBoundaries.endDate).length}</p>
                </div>
                <div className={meshStatsStyles.stat}>
                  <h3>Contributions</h3>
                  <p>{filterMeshSdkContributors(contributorStats.contributors, timeWindowBoundaries.startDate, timeWindowBoundaries.endDate)
                    .reduce((total, contributor) => total + contributor.contributions, 0)}</p>
                </div>
                <div className={meshStatsStyles.stat}>
                  <h3>Commits</h3>
                  <p>{filterMeshSdkContributors(contributorStats.contributors, timeWindowBoundaries.startDate, timeWindowBoundaries.endDate)
                    .reduce((total, contributor) => total + contributor.commits, 0)}</p>
                </div>
                <div className={meshStatsStyles.stat}>
                  <h3>Pull Requests</h3>
                  <p>{filterMeshSdkContributors(contributorStats.contributors, timeWindowBoundaries.startDate, timeWindowBoundaries.endDate)
                    .reduce((total, contributor) => total + contributor.pull_requests, 0)}</p>
                </div>
              </div>
            )}
            
            {/* Line Charts Grid */}
            <div className={meshStatsStyles.chartsGrid} style={{ 
              marginTop: '20px',
              marginBottom: '40px'
            }}>
              {/* Mesh Repository Activity Chart */}
              <div className={meshStatsStyles.chart} style={{ 
                background: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '600px',
                height: '600px'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '10px', color: 'rgba(0, 0, 0, 0.95)' }}>
                  Mesh SDK Repository Activity
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(0, 0, 0, 0.7)', marginBottom: '20px' }}>
                  Monthly contribution trends for the main Mesh repository
                </p>
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {contributorStats?.contributors && (
                    <MeshRepositoriesEvolutionChart
                      contributors={contributorStats.contributors}
                      height={400}
                      maxRepositories={1}
                      globalStartDate={timeWindowBoundaries.startDate || undefined}
                      globalEndDate={timeWindowBoundaries.endDate || undefined}
                    />
                  )}
                </div>
              </div>
              
              {/* Contributors Chart */}
              <div className={meshStatsStyles.chart} style={{ 
                background: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '600px',
                height: '600px'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '10px', color: 'rgba(0, 0, 0, 0.95)' }}>
                  Contributors Activity
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(0, 0, 0, 0.7)', marginBottom: '20px' }}>
                  Monthly contribution trends by contributor
                </p>
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {contributorStats?.contributors && (
                    <MeshSdkContributorsChart
                      contributors={filterMeshSdkContributors(contributorStats.contributors, timeWindowBoundaries.startDate, timeWindowBoundaries.endDate)}
                      height={350}
                      maxContributors={15}
                      globalStartDate={timeWindowBoundaries.startDate || undefined}
                      globalEndDate={timeWindowBoundaries.endDate || undefined}
                    />
                  )}
                </div>
              </div>
            </div>
        </div>
        
        {/* Funding section with teal vertical bar */}
        <div style={{ marginTop: '40px' }}>
          <div className={carouselStyles.carouselHeader}>
            <h2 className={carouselStyles.carouselTitle}>Funding</h2>
            <p className={carouselStyles.carouselSubtitle}>
              Catalyst funding that supports Mesh SDK development
            </p>
          </div>
          
          <div style={{ marginTop: '20px' }}>
            {/* Funding Metrics */}
            <div className={meshStatsStyles.statsGrid}>
              <div className={meshStatsStyles.stat}>
                <h3>Total Proposals</h3>
                <p>{meshSdkProposals.length}</p>
              </div>
              <div className={meshStatsStyles.stat}>
                <h3>Total Funding</h3>
                <p>₳ {formatNumber(meshSdkProposals.reduce((total, project) => total + project.projectDetails.budget, 0))}</p>
              </div>
              <div className={meshStatsStyles.stat}>
                <h3>Funds Distributed</h3>
                <p>₳ {formatNumber(meshSdkProposals.reduce((total, project) => total + project.projectDetails.funds_distributed, 0))}</p>
              </div>
              <div className={meshStatsStyles.stat}>
                <h3>Completion Rate</h3>
                <p>{Math.round((meshSdkProposals.reduce((total, project) => total + project.milestonesCompleted, 0) / 
                   meshSdkProposals.reduce((total, project) => total + project.projectDetails.milestones_qty, 0)) * 100)}%</p>
              </div>
            </div>
            
            <div className={projectStyles.proposalGrid}>
              {meshSdkProposals.map((project: CatalystProject) => (
                <MeshSDKProposalCard 
                  key={project.projectDetails.id} 
                  project={project}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
