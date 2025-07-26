;; ShikshaChain - Tamper-Proof NFT Degrees for Odisha Universities
;; A blockchain-based degree verification system using SIP-009 NFTs

;; Define the NFT
(define-non-fungible-token degree-certificate uint)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-authorized (err u101))
(define-constant err-degree-exists (err u102))
(define-constant err-invalid-data (err u103))
(define-constant err-degree-not-found (err u104))

;; Data Variables
(define-data-var next-degree-id uint u1)

;; Data Maps
(define-map degree-details uint {
  student-name: (string-ascii 64),
  university: principal,
  course: (string-ascii 64),
  graduation-year: uint,
  student-address: principal,
  issue-date: uint,
  degree-hash: (buff 32),
  metadata-uri: (string-ascii 256)
})

(define-map authorized-universities principal bool)

;; Initialize authorized universities (only contract owner can add)
(define-public (add-authorized-university (university principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (map-set authorized-universities university true)
    (ok true)))

;; Function 1: Mint Degree NFT (Only authorized universities can mint)
(define-public (mint-degree 
    (student-address principal)
    (student-name (string-ascii 64))
    (course (string-ascii 64))
    (graduation-year uint)
    (degree-hash (buff 32))
    (metadata-uri (string-ascii 256)))
  (let ((degree-id (var-get next-degree-id))
        (university tx-sender)
        (current-time u0)) ;; Using u0 as placeholder timestamp
    (begin
      ;; Check if university is authorized
      (asserts! (default-to false (map-get? authorized-universities university)) err-not-authorized)
      
      ;; Validate inputs
      (asserts! (> (len student-name) u0) err-invalid-data)
      (asserts! (> (len course) u0) err-invalid-data)
      (asserts! (> graduation-year u2000) err-invalid-data)
      
      ;; Store degree details
      (map-set degree-details degree-id {
        student-name: student-name,
        university: university,
        course: course,
        graduation-year: graduation-year,
        student-address: student-address,
        issue-date: current-time,
        degree-hash: degree-hash,
        metadata-uri: metadata-uri
      })
      
      ;; Mint NFT to student
      (try! (nft-mint? degree-certificate degree-id student-address))
      
      ;; Increment degree ID for next mint
      (var-set next-degree-id (+ degree-id u1))
      
      ;; Print event for indexing
      (print {
        event: "degree-minted",
        degree-id: degree-id,
        student: student-address,
        university: university,
        course: course,
        graduation-year: graduation-year
      })
      
      (ok degree-id))))

;; Function 2: Verify Degree (Public read function for employers/verification)
(define-read-only (verify-degree (degree-id uint))
  (let ((degree-info (map-get? degree-details degree-id))
        (owner (nft-get-owner? degree-certificate degree-id)))
    (match degree-info
      details (ok {
        degree-id: degree-id,
        student-name: (get student-name details),
        university: (get university details),
        course: (get course details),
        graduation-year: (get graduation-year details),
        current-owner: owner,
        original-student: (get student-address details),
        issue-date: (get issue-date details),
        degree-hash: (get degree-hash details),
        metadata-uri: (get metadata-uri details),
        is-valid: (is-some owner)
      })
      err-degree-not-found)))

;; Additional helper functions for SIP-009 compliance
(define-read-only (get-last-token-id)
  (ok (- (var-get next-degree-id) u1)))

(define-read-only (get-token-uri (degree-id uint))
  (match (map-get? degree-details degree-id)
    details (ok (some (get metadata-uri details)))
    (ok none)))

(define-read-only (get-owner (degree-id uint))
  (ok (nft-get-owner? degree-certificate degree-id)))

;; Get degree by owner (for students to view their degrees)
(define-read-only (get-degrees-by-owner (owner principal))
  (ok "Use external indexer to query degrees by owner"))

;; Check if university is authorized
(define-read-only (is-authorized-university (university principal))
  (ok (default-to false (map-get? authorized-universities university))))