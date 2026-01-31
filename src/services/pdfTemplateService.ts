import { ChangeHistoryItem } from '../types';

export const generateChangelogHTML = (
  deckName: string,
  changelog: ChangeHistoryItem
): string => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const cardsAddedHTML = changelog.cardsAdded.length > 0
    ? changelog.cardsAdded
        .map(
          (cc) => `
          <div class="card-item added">
            <div class="card-header">
              <span class="card-name">${cc.name}</span>
              <span class="card-quantity">×${cc.quantity}</span>
            </div>
            <div class="card-details">
              <span class="card-type">${cc.typeLine || 'Unknown'}</span>
              ${cc.manaCost ? `<span class="mana-cost">${cc.manaCost}</span>` : ''}
            </div>
            ${cc.reasoning ? `<div class="reasoning">${cc.reasoning}</div>` : ''}
          </div>
        `
        )
        .join('')
    : '<p class="no-cards">No cards added</p>';

  const cardsRemovedHTML = changelog.cardsRemoved.length > 0
    ? changelog.cardsRemoved
        .map(
          (cc) => `
          <div class="card-item removed">
            <div class="card-header">
              <span class="card-name">${cc.name}</span>
              <span class="card-quantity">×${cc.quantity}</span>
            </div>
            <div class="card-details">
              <span class="card-type">${cc.typeLine || 'Unknown'}</span>
              ${cc.manaCost ? `<span class="mana-cost">${cc.manaCost}</span>` : ''}
            </div>
            ${cc.reasoning ? `<div class="reasoning">${cc.reasoning}</div>` : ''}
          </div>
        `
        )
        .join('')
    : '<p class="no-cards">No cards removed</p>';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deck Suggestions - ${deckName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      color: #333;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #6200ee 0%, #4a148c 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .header .deck-name {
      font-size: 24px;
      font-weight: 500;
      opacity: 0.95;
      margin-bottom: 12px;
    }
    
    .header .date {
      font-size: 16px;
      opacity: 0.85;
      font-weight: 300;
    }
    
    .content {
      padding: 30px;
    }
    
    .description {
      background: #f5f5f5;
      border-left: 4px solid #6200ee;
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 8px;
      font-size: 16px;
      line-height: 1.6;
      color: #555;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section-title {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #e0e0e0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section-title.added {
      color: #2e7d32;
      border-bottom-color: #4caf50;
    }
    
    .section-title.removed {
      color: #c62828;
      border-bottom-color: #f44336;
    }
    
    .section-title .icon {
      font-size: 28px;
    }
    
    .card-item {
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 16px;
      transition: all 0.3s ease;
    }
    
    .card-item.added {
      border-color: #4caf50;
      background: linear-gradient(to right, #f1f8f4 0%, white 100%);
    }
    
    .card-item.removed {
      border-color: #f44336;
      background: linear-gradient(to right, #fef1f1 0%, white 100%);
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .card-name {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
    }
    
    .card-quantity {
      font-size: 16px;
      font-weight: 700;
      color: #6200ee;
      background: #e8e0f5;
      padding: 4px 12px;
      border-radius: 20px;
    }
    
    .card-details {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: 8px;
      font-size: 14px;
      color: #666;
    }
    
    .card-type {
      font-style: italic;
    }
    
    .mana-cost {
      font-family: 'Courier New', monospace;
      background: #f5f5f5;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      color: #333;
    }
    
    .reasoning {
      margin-top: 12px;
      padding: 12px;
      background: #fafafa;
      border-left: 3px solid #6200ee;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1.5;
      color: #555;
      font-style: italic;
    }
    
    .no-cards {
      text-align: center;
      color: #999;
      font-style: italic;
      padding: 20px;
      font-size: 16px;
    }
    
    /* Print-specific rules to prevent page breaks */
    @media print {
      .card-item {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      .section {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      .section-title {
        page-break-after: avoid;
        break-after: avoid;
      }
      
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
      }
    }
    
    .footer {
      background: #f5f5f5;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #666;
      border-top: 1px solid #e0e0e0;
    }
    
    .footer strong {
      color: #6200ee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎴 Deck Suggestions</h1>
      <div class="deck-name">${deckName}</div>
      <div class="date">${formatDate(changelog.changeDate)}</div>
    </div>
    
    <div class="content">
      ${
        changelog.description
          ? `
          <div class="section">
            <h2 class="section-title" style="color: #6200ee; border-bottom-color: #6200ee;">
              <span class="icon">📝</span>
              General Notes
            </h2>
            <div class="description">${changelog.description}</div>
          </div>
          `
          : ''
      }
      
      <div class="section">
        <h2 class="section-title added">
          <span class="icon">➕</span>
          Cards to Add (${changelog.cardsAdded.reduce((sum, cc) => sum + cc.quantity, 0)})
        </h2>
        ${cardsAddedHTML}
      </div>
      
      <div class="section">
        <h2 class="section-title removed">
          <span class="icon">➖</span>
          Cards to Remove (${changelog.cardsRemoved.reduce((sum, cc) => sum + cc.quantity, 0)})
        </h2>
        ${cardsRemovedHTML}
      </div>
    </div>
    
    <div class="footer">
      Generated with <strong>RefinedMTG</strong> • ${formatDate(Date.now())}
    </div>
  </div>
</body>
</html>
  `;
};
