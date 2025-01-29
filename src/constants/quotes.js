const meetingQuotes = [
    "Great things are never done by one person; they’re done by a team of people. - Steve Jobs",
    "None of us is as smart as all of us. - Ken Blanchard",
    "Many hands make light work. – John Heywood",
    "Coming together is a beginning. Keeping together is progress. Working together is success. — Henry Ford",
    "Don’t show up to prove. Show up to improve. - Simon Sinek"
  ];
  
  export const getRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * meetingQuotes.length);
    return meetingQuotes[randomIndex];
  };
  
