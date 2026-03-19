/**
 * Strips a redundant parent feature title prefix from a story title.
 *
 * Teams often name stories as "<Feature Title> - <Story name>" or
 * "<Feature Title>: <Story name>". In the expandable story list on a
 * feature card the parent title is already visible, so showing it again
 * in each story row is noisy. This function strips it when present.
 *
 * The comparison is case-insensitive; the returned string is trimmed.
 */
export function stripFeaturePrefix(storyTitle: string, featureTitle: string): string {
  if (!storyTitle || !featureTitle) return storyTitle;

  const lowerStory   = storyTitle.toLowerCase();
  const lowerFeature = featureTitle.toLowerCase().trim();

  for (const sep of [' - ', ': ']) {
    const prefix = lowerFeature + sep;
    if (lowerStory.startsWith(prefix)) {
      return storyTitle.slice(prefix.length).trim();
    }
  }

  return storyTitle;
}
