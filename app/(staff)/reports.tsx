import React from 'react';
import { AnalyticsView } from '../../src/ui/AnalyticsView';
import { H1 } from '../../src/ui/kit';

// Only the distributors mapped to this employee; the server enforces the scope.
export default function StaffReports() {
  return <AnalyticsView base="/staff/team" title={<H1>Team report</H1>} />;
}
