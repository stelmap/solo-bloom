import { beforeEach, describe, expect, it } from 'vitest';
import { campaignAttribution, clearCampaignAttribution, parseCampaign } from '../campaignAttribution';

describe('social campaign registration attribution', () => {
  beforeEach(() => sessionStorage.clear());
  it('retains Instagram source through navigation to registration', () => {
    campaignAttribution('?utm_source=instagram&utm_medium=social&utm_campaign=profile_launch', true, sessionStorage);
    expect(campaignAttribution('?mode=signup', true, sessionStorage)).toEqual({ utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'profile_launch' });
  });
  it('retains Threads source independently from Instagram', () => {
    campaignAttribution('?utm_source=threads&utm_medium=social', true, sessionStorage);
    expect(campaignAttribution('', true, sessionStorage).utm_source).toBe('threads');
  });
  it('does not persist without analytics consent', () => {
    campaignAttribution('?utm_source=instagram', false, sessionStorage);
    expect(sessionStorage.length).toBe(0);
  });
  it('does not collect private form fields or arbitrary query values', () => {
    expect(parseCampaign('?email=private@example.invalid&token=secret&utm_source=threads')).toEqual({ utm_source: 'threads' });
  });
  it('clears saved attribution on withdrawal', () => {
    campaignAttribution('?utm_source=threads', true, sessionStorage);
    clearCampaignAttribution(sessionStorage);
    expect(campaignAttribution('', true, sessionStorage)).toEqual({});
  });
});