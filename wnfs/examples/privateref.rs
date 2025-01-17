use chrono::Utc;
use rand::thread_rng;
use sha3::Sha3_256;
use std::{io::Cursor, rc::Rc};
use wnfs::{
    ipld::{DagCborCodec, Decode, Encode, Ipld, Serializer},
    private::{Key, PrivateForest, PrivateRef, RevisionKey},
    ratchet::Ratchet,
    rng::RngCore,
    utils, Hasher, MemoryBlockStore, Namefilter, PrivateDirectory, PrivateOpResult,
};

#[tokio::main(flavor = "multi_thread")]
async fn main() -> anyhow::Result<()> {
    // ----------- Prerequisites -----------

    let store = &mut MemoryBlockStore::default();
    let rng = &mut thread_rng();
    let forest = Rc::new(PrivateForest::new());

    // ----------- Create a private directory -----------

    // Some existing user key.
    let some_key = Key::new(utils::get_random_bytes::<32>(rng));

    // Creating ratchet_seed from our user key. And intializing the inumber and namefilter.
    let ratchet_seed = Sha3_256::hash(&some_key.as_bytes());
    let inumber = utils::get_random_bytes::<32>(rng); // Needs to be random

    // Create a root directory from the ratchet_seed, inumber and namefilter. Directory gets saved in forest.
    let PrivateOpResult {
        forest, root_dir, ..
    } = PrivateDirectory::new_with_seed_and_store(
        Namefilter::default(),
        Utc::now(),
        ratchet_seed,
        inumber,
        forest,
        store,
        rng,
    )
    .await
    .unwrap();

    // ----------- Create a subdirectory -----------

    // Add a /movies/anime to the directory.
    let PrivateOpResult {
        forest, root_dir, ..
    } = root_dir
        .mkdir(
            &["movies".into(), "anime".into()],
            true,
            Utc::now(),
            forest,
            store,
            rng,
        )
        .await?;

    // --------- Generate a private ref (Method 1) -----------

    // We can create a revision_key from our ratchet_seed.
    let ratchet = Ratchet::zero(ratchet_seed);
    let revision_key = RevisionKey::from(Key::new(ratchet.derive_key()));

    // Now let's serialize the root_dir's private_ref.
    let cbor = encode(&root_dir.header.get_private_ref(), &revision_key, rng)?;

    // We can deserialize the private_ref using the revision_key at hand.
    let private_ref = decode(cbor, &revision_key)?;

    // Now we can fetch the directory from the forest using the private_ref.
    let fetched_node = forest
        .get(&private_ref, PrivateForest::resolve_lowest, store)
        .await?;

    println!("{:#?}", fetched_node);

    // --------- Generate a private ref (Method 2) -----------

    // We can also create a private_ref from scratch if we remember the parameters.
    let private_ref = PrivateRef::with_seed(Namefilter::default(), ratchet_seed, inumber);

    // And we can fetch the directory again using the generated private_ref.
    let fetched_node = forest
        .get(&private_ref, PrivateForest::resolve_lowest, store)
        .await?;

    println!("{:#?}", fetched_node);

    // The private_ref might point to some old revision of the root_dir.
    // We can do the following to get the latest revision.
    let fetched_dir = fetched_node
        .unwrap()
        .search_latest(&forest, store)
        .await?
        .as_dir()?;

    println!("{:#?}", fetched_dir);

    Ok(())
}

fn encode(
    private_ref: &PrivateRef,
    revision_key: &RevisionKey,
    rng: &mut impl RngCore,
) -> anyhow::Result<Vec<u8>> {
    let mut bytes = Vec::new();
    let ipld = private_ref.serialize(Serializer, revision_key, rng)?;
    ipld.encode(DagCborCodec, &mut bytes)?;
    Ok(bytes)
}

fn decode(bytes: Vec<u8>, revision_key: &RevisionKey) -> anyhow::Result<PrivateRef> {
    let ipld = Ipld::decode(DagCborCodec, &mut Cursor::new(bytes))?;
    PrivateRef::deserialize(ipld, revision_key).map_err(Into::into)
}
