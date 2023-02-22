// CONFIG.debug.hooks = true;

const entityEffectLinkAffector = html => {    
    if (html === null || html === undefined) return undefined;

    const links = html.find('a.content-link:not([data-affector])');

    if (links === null || links === undefined || (Array.isArray(links) && !links.length)) return undefined;

    setTimeout(() => {
        for (let link of links) {
            const $link = $(link);
            $link.attr('data-affector', '1');
            $link.removeClass('content-link');
            $link.addClass('content-link-affector');
        }
    }, 0);
};

const _hasEffect = (actor, effect) => {
  return actor.itemTypes.effect.find(e => e.flags.core?.sourceId === effect);
}

const _onClickContentEffectLink = async (event) => {
    event.preventDefault();
    const doc = await fromUuid(event.currentTarget.dataset.uuid);
    const effect = doc.toObject();
    if (event.shiftKey) {
        const controlled = canvas?.tokens?.controlled;
        if (controlled?.length > 0) {
             controlled.map(async (token) => {if (!_hasEffect(token.actor, effect)) await token.actor.createEmbeddedDocuments('Item', [effect])});
        } else ui.notifications.error(game.i18n.localize('PF2E.ErrorMessage.NoTokenSelected'))
        window._token = controlled[0];
    } else if (event.altKey) {
        const targets = game?.user?.targets;
        if (targets?.size > 0) {
            targets.map(async (token) => {if (!_hasEffect(token.actor, effect)) await token.actor.createEmbeddedDocuments('Item', [effect])});
        } else ui.notifications.error(game.i18n.localize('PF2E.ErrorMessage.NoTokenSelected'))
    } else {
        return doc?._onClickDocumentLink(event);
    }
};

const _onDragContentEffectLink = (event) => {
    event.stopPropagation();
    const a = event.currentTarget;
    let dragData = null;

    // Case 1 - Compendium Link
    if ( a.dataset.pack ) {
        const pack = game.packs.get(a.dataset.pack);
        let id = a.dataset.id;
        if ( a.dataset.lookup && pack.index.size ) {
            const entry = pack.index.find(i => (i._id === a.dataset.lookup) || (i.name === a.dataset.lookup));
            if ( entry ) id = entry._id;
        }
        if ( !a.dataset.uuid && !id ) return false;
        const uuid = a.dataset.uuid || `Compendium.${pack.collection}.${id}`;
        dragData = { type: pack.documentName, uuid };
    }

    // Case 2 - World Document Link
    else {
        const doc = fromUuidSync(a.dataset.uuid);
        dragData = doc.toDragData();
    }

    event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
};
  
const body = $("body");
body.on("click", "a.content-link-affector", _onClickContentEffectLink);
body.on("dragstart", "a.content-link-affector", _onDragContentEffectLink);

Hooks.on('init', () => {
    console.info('Entity Link Affector enabled');
    Hooks.on('renderChatMessage', (_, html) => entityEffectLinkAffector(html));
    Hooks.on('renderChatLog', (_, html) => entityEffectLinkAffector(html));
    Hooks.on('renderChatPopout', (_, html) => entityEffectLinkAffector(html));
});


