
const mergeHash = (h1, h2) => {
  const result = {};

  h1 && Object.keys(h1).forEach(key => {
    result[key] = !!h1[key];
  });
  h2 && Object.keys(h2).forEach(key => {
    if (!result[key]) {
      result[key] = !!h2[key];
    }
  });

  return result;
};

const getMutual = (src, target) => {
  let mutual = 0;
  let favorite = 0;
  Object.keys(target).forEach(key => {
    if (src.hasOwnProperty(key)) {
      if (src[key] && target[key]) favorite++;
      mutual++;
    }
  });

  return [mutual, favorite];
};

const totalFav = (items) => {
  let fav = 0;
  Object.keys(items).forEach(key => {
    if (items[key]) fav++;
  });

  return fav;
};

const validatedPercent = (percent) => percent > 100 ? 100 : (percent < 0 ? 0 : percent);

const calculatePercentageMatch = ({ total, curTotal, mutual, fav, totalFav }) => {
  const totalSum = total + curTotal;

  if (totalSum === 0) return 0;

  const favPercentMatch = totalFav === 0 ? 0 : ((fav / totalFav) * 100);
  const percentMatch = ((mutual - fav) / Math.floor(totalSum / 2 - fav)) * 100;

  if (percentMatch == 0 || favPercentMatch == 0) {
    return validatedPercent(Math.max(favPercentMatch, percentMatch));
  }

  const result = (percentMatch + favPercentMatch) / 2;

  return validatedPercent(result);
};

class CompatibilityService {
  constructor(compatibilityRepository, hobbieRepository, quizRepository) {
    this.compatibilityRepository = compatibilityRepository;
    this.hobbieRepository = hobbieRepository;
    this.quizRepository = quizRepository;
  }

  async calculateInterestsCompatibility(targetUserId) {
    const compatibilities = await this.quizRepository.findHighCompatibilitiesForUser(targetUserId);
    const userIds = compatibilities.map(({ user_one_id, user_two_id }) => targetUserId === user_one_id ? user_two_id : user_one_id);

    const totalUserIds = [...userIds, targetUserId];
    const [
      hobbies,
      customHobbies,
      activities,
      customActivities
    ] = await Promise.all([
      this.hobbieRepository.getHobbiesForUsers(totalUserIds),
      this.hobbieRepository.getCustomHobbiesForUsers(totalUserIds),
      this.hobbieRepository.getActivitiesForUsers(totalUserIds),
      this.hobbieRepository.getCustomActivitiesForUsers(totalUserIds)
    ]);

    const currentUserHobbies = mergeHash(hobbies[targetUserId], customHobbies[targetUserId]);
    const currentUserActivities = mergeHash(activities[targetUserId], customActivities[targetUserId]);

    const currentUserTotalHobbies = Object.keys(currentUserHobbies).length;
    const currentUserTotalActivities = Object.keys(currentUserActivities).length;
    const currentUserFavHobbies = totalFav(currentUserHobbies);
    const currentUserFavActivities = totalFav(currentUserActivities);

    await this.compatibilityRepository.deleteInterestCompatibilityForUser(targetUserId);

    userIds.forEach(userId => {
      const uActivities = activities[userId];
      const uCActivities = customActivities[userId];
      const uHobbies = hobbies[userId];
      const uCHobbies = customHobbies[userId];

      const userHobbies = mergeHash(uHobbies, uCHobbies);
      const userActivities = mergeHash(uActivities, uCActivities);

      const [mutualHobbies, hFav] = getMutual(currentUserHobbies, userHobbies);
      const [mutualActivities, aFav] = getMutual(currentUserActivities, userActivities);

      const totalHobbies = Object.keys(userHobbies).length;
      const totalActivities = Object.keys(userActivities).length;

      const userFavHobbies = totalFav(userHobbies);
      const userFavActivities = totalFav(userHobbies);

      const hobbiesPercentMatch = calculatePercentageMatch({
        total: totalHobbies,
        curTotal: currentUserTotalHobbies,
        mutual: mutualHobbies,
        fav: hFav,
        totalFav: Math.max(userFavHobbies, currentUserFavHobbies)
      });
      const activitiesPercentMatch = calculatePercentageMatch({
        total: totalActivities,
        curTotal: currentUserTotalActivities,
        mutual: mutualActivities,
        fav: aFav,
        totalFav: Math.max(userFavActivities, currentUserFavActivities)
      });
      const percentMatch = Math.trunc((hobbiesPercentMatch + activitiesPercentMatch) / 2);

      if (isNaN(percentMatch) || percentMatch == 0) return;

      this.compatibilityRepository.createInterestCompatibility(
        targetUserId,
        userId,
        percentMatch
      );
    });
  }

  async deleteScheduledCompatibilityCalculations(userIds) {
    return await this.compatibilityRepository.deleteScheduledCompatibilityCalculations(userIds);
  }

  async scheduleForCompatibilityCalculation(userId) {
    const scheduledAlready = await this.compatibilityRepository.hasScheduledCompatibilityCalculation(userId);
    if (scheduledAlready) return;

    return await this.compatibilityRepository.createCompatibilityCalculationSchedule(userId);
  }

  async scheduleForInterestCalculation(userId) {
    const scheduledAlready = await this.compatibilityRepository.hasScheduledInterestCalculation(userId);
    if (scheduledAlready) return;

    return await this.compatibilityRepository.createInterestCalculationSchedule(userId);
  }
}

module.exports = CompatibilityService;
