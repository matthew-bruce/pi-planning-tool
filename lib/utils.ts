export const formatSprintRange = (startDate: string, endDate: string) => {
  const formatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
  return `${formatter.format(new Date(startDate))} – ${formatter.format(new Date(endDate))}`;
};
