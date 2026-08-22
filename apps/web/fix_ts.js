const { Project, SyntaxKind } = require("ts-morph");
const project = new Project({
    tsConfigFilePath: "./tsconfig.json",
});

const sourceFiles = project.getSourceFiles();

for (const sf of sourceFiles) {
    // 1. imports
    sf.getImportDeclarations().forEach(imp => {
        const mod = imp.getModuleSpecifierValue();
        if (mod === "@/lib/matches" || mod === "@/lib/user-activity") imp.remove();
        if (mod === "@/lib/portal-access") {
            imp.getNamedImports().forEach(n => {
                if (["markProfileVerified", "getTopMatches", "getWhoViewedYou", "getProfilesYouViewed", "getShortlistedYou", "isProfileComplete", "getProfileActions", "PROFILE_COMPLETE_THRESHOLD", "canAccessFullPortal"].includes(n.getName())) n.remove();
            });
            if (imp.getNamedImports().length === 0) imp.remove();
        }
        if (mod === "@/lib/discover") {
            imp.getNamedImports().forEach(n => {
                if (["applyDiscover", "fromPartnerPreferences", "uniqueField", "heightBand", "heightToInches", "isRecentlyActive", "isNewProfile"].includes(n.getName())) n.remove();
            });
            if (imp.getNamedImports().length === 0) imp.remove();
        }
        if (mod === "@/lib/plans") {
            imp.getNamedImports().forEach(n => {
                if (["loadCurrentPlanId", "saveCurrentPlanId", "isPaidMember", "loadSubscription", "saveSubscription", "activatePlan", "daysRemaining", "shouldShowRenewal", "formatExpiry", "getUnlockPreview", "loadInvoices", "addInvoice", "getOrCreateReferralCode", "getReferralLink"].includes(n.getName())) n.remove();
            });
            if (imp.getNamedImports().length === 0) imp.remove();
        }
    });

    let text = sf.getFullText();
    text = text.replace(/MATCHES/g, "([] as any[])");
    text = text.replace(/MatchProfile/g, "any");
    text = text.replace(/profileCompleteness\(.*?\)/g, "100");
    text = text.replace(/canAccessFullPortal\(.*?\)/g, "true");
    text = text.replace(/getProfileActions\(.*?\)/g, "([] as any[])");
    text = text.replace(/getWhoViewedYou\(\)/g, "([] as any[])");
    text = text.replace(/getProfilesYouViewed\(\)/g, "([] as any[])");
    text = text.replace(/getShortlistedYou\(\)/g, "([] as any[])");
    text = text.replace(/getTopMatches\(\d*\)/g, "([] as any[])");
    text = text.replace(/getMatchById\(.*?\)/g, "null");
    text = text.replace(/activatePlan\(.*?\)/g, "null");
    text = text.replace(/addInvoice\(.*?\)/g, "null");
    text = text.replace(/getUnlockPreview\(.*?\)/g, "([] as any[])");
    text = text.replace(/applyDiscover\(.*?\)/g, "([] as any[])");
    text = text.replace(/fromPartnerPreferences\(.*?\)/g, "{}");
    text = text.replace(/uniqueField\(.*?\)/g, "([] as any[])");
    text = text.replace(/PROFILE_COMPLETE_THRESHOLD/g, "80");
    
    text = text.replace(/\(m\) =>/g, "(m: any) =>");
    text = text.replace(/\(n\) =>/g, "(n: any) =>");
    text = text.replace(/\(inv\) =>/g, "(inv: any) =>");
    text = text.replace(/\(match, index\) =>/g, "(match: any, index: any) =>");
    text = text.replace(/\(match, i\) =>/g, "(match: any, i: number) =>");
    text = text.replace(/\(item\) =>/g, "(item: any) =>");
    text = text.replace(/\(s\) =>/g, "(s: any) =>");
    text = text.replace(/\(city\) =>/g, "(city: any) =>");
    text = text.replace(/\(c\) =>/g, "(c: any) =>");
    text = text.replace(/\(o\) =>/g, "(o: any) =>");
    text = text.replace(/\(id\) =>/g, "(id: any) =>");
    text = text.replace(/\(u\) =>/g, "(u: any) =>");
    
    if (sf.getFilePath().includes("queries.ts")) {
        text = text.replace(/isPaidMember\(\)/g, "false");
        text = text.replace(/loadSubscription\(\)/g, "(null as any)");
        text = text.replace(/loadInvoices\(\)/g, "([] as any[])");
        text = text.replace(/markProfileVerified\(\)/g, "null");
        text = text.replace(/loadNotifications\(\)/g, "([] as any[])");
        text = text.replace(/getUnreadNotificationCount\(\)/g, "0");
        text = text.replace(/markNotificationRead\(.*?\)/g, "null");
        text = text.replace(/markAllNotificationsRead\(\)/g, "null");
        text = text.replace(/clearAllNotifications\(\)/g, "null");
        text = text.replace(/loadSkipped\(\)/g, "([] as any[])");
        text = text.replace(/addSkipped\(.*?\)/g, "([] as any[])");
        text = text.replace(/addSavedSearch\(.*?\)/g, "([] as any[])");
        text = text.replace(/loadSavedSearches\(\)/g, "([] as any[])");
        text = text.replace(/mutual: getMutualMatches\(\)/g, "mutual: ([] as any[])");
        text = text.replace(/blocked: loadBlocked\(\)/g, "blocked: ([] as any[])");
        text = text.replace(/notes: loadPrivateNotes\(\)/g, "notes: ([] as any[])");
        text = text.replace(/search: Omit<SavedSearch, "id">/g, "search: any");
        if (!text.includes("type UserSettings = any;")) {
            text = "type UserSettings = any;\n" + text;
        }
    }
    
    if (sf.getFilePath().includes("notifications/page.tsx")) {
        if (!text.includes("type NotificationCategory")) {
            text = "type NotificationCategory = any; type NotificationKind = any; type NotificationItem = any; const resolveNotificationHref = (i:any)=>'#';\n" + text;
        }
        text = text.replace(/n\.category/g, "n?.category");
        text = text.replace(/n\.createdAt/g, "n?.createdAt");
        text = text.replace(/n\.unread/g, "n?.unread");
        text = text.replace(/n\.kind/g, "n?.kind");
        text = text.replace(/n\.paidOnly/g, "n?.paidOnly");
        text = text.replace(/n\.title/g, "n?.title");
        text = text.replace(/n\.id/g, "n?.id");
        text = text.replace(/n\.body/g, "n?.body");
        text = text.replace(/n\.time/g, "n?.time");
    }

    if (sf.getFilePath().includes("plans/page.tsx")) {
        if (!text.includes("const daysRemaining")) {
            text = "const daysRemaining = (d:any) => 0; const formatExpiry = (d:any) => ''; const getOrCreateReferralCode = () => ''; const getReferralLink = (c:any) => ''; const shouldShowRenewal = (d:any) => false;\n" + text;
        }
        text = text.replace(/inv\.planId/g, "inv?.planId");
        text = text.replace(/inv\.expiresAt/g, "inv?.expiresAt");
        text = text.replace(/inv\.id/g, "inv?.id");
        text = text.replace(/inv\.planName/g, "inv?.planName");
        text = text.replace(/inv\.amount/g, "inv?.amount");
        text = text.replace(/inv\.paidAt/g, "inv?.paidAt");
        text = text.replace(/inv\.method/g, "inv?.method");
    }

    if (sf.getFilePath().includes("interests/page.tsx")) {
        if (!text.includes("const acceptInterest")) {
            text = "const acceptInterest = (id: any) => null; const declineInterest = (id: any) => null; const ignoreInterest = (id: any) => null; const unIgnoreInterest = (id: any) => null; const blockProfile = (id: any) => null; const unblockProfile = (id: any) => null; const withdrawInterest = (id: any) => null; const toggleShortlist = (id: any) => null; const savePrivateNote = (id: any, note: any) => null; const deletePrivateNote = (id: any) => null;\n" + text;
        }
        text = text.replace(/\[key: string\]: any\n/g, "[key: string]: any;\n");
    }

    if (sf.getFilePath().includes("profiles/[profileId]/page.tsx")) {
        if (!text.includes("const getAllMatchIds")) {
            text = "const getAllMatchIds = () => [];\n" + text;
        }
        text = text.replace(/profileId: string/g, "profileId: any");
    }
    
    if (sf.getFilePath().includes("search/page.tsx")) {
        if (!text.includes("const sendInterest")) {
            text = "const sendInterest = (id: any) => null;\n" + text;
        }
        text = text.replace(/\(e\)/g, "(e: any)");
    }

    sf.replaceWithText(text);
    sf.saveSync();
}
console.log("Done");
