$(document).ready(function () {
  updateReviewCount();

  // 리뷰 탭을 누를 때 리뷰 목록 함수 실행
  $('a[data-bs-toggle="tab"]').off('shown.bs.tab').on('shown.bs.tab', function (e) {
    if (e.target.id === 'review-tab') {
      loadReviews(0, "likes");
    }
  });

  // 리뷰 이미지 미리보기 함수
  $("#reviewImages").change(function () {
    const preview = $('#imagePreivew');
    preview.empty();

    if (this.files.length > 3) {
      showAlert('이미지는 최대 3장까지 첨부할 수 있습니다.', 'warning');
      this.value = '';
      return;
    }

    Array.from(this.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = function (e) {
        preview.append(`
          <div class="position-relative d-inline-block me-2 mb-2">
            <img src="${e.target.result}" class="img-thumbnail"
                style="width: 100px; height: 100px; object-fit: cover;">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-1"
                    style="background-color: white;"></button>
          </div>
        `);
      };
      reader.readAsDataURL(file);
    });
  });

  // 이미지 미리보기 제거하는 함수
  $(document).on('click', '.btn-close', function () {
    $(this).parent().remove();
  });

  // 리뷰 작성할 때 태그 버튼 하나만 선택하게 하는 함수
  $(document).on('change', 'input[name="tagType"], input[name="editTagType"]', function () {
    const name = $(this).attr('name');
    $(`input[name="${name}"]`).not(this).prop('checked', false);
  });

  // 리뷰 작성 모달창에서 작성 누를 때 실행
  $("#reviewForm").off("submit").on("submit", function (e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('bookId', $("#bookId").val());
    formData.append('rating', $("#rating").val());
    formData.append('content', $("#content").val());

    // 태그 눌렀는지 확인
    const checkTag = $("input[name='tagType']:checked").val();
    if (checkTag) {
      formData.append('tagType', checkTag);
    }

    // 이미지 첨부했는지 확인
    const imageFiles = $('#reviewImages')[0].files;
    Array.from(imageFiles).forEach(file => {
      formData.append('reviewImages', file);
    });

    $.ajax({
      url: "/reviews",
      type: "Post",
      data: formData,
      processData: false,
      contentType: false,
      success: function (result) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('reviewModal'));
        modal.hide();
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open').removeAttr('style');

        $("#content").val("");
        $("#rating").val('5');
        $("#imagePreview").empty();
        $("#reviewImages").val('');
        $("input[name='tagType']").prop('checked', false);

        // 리뷰 목록, 통계, 평점 업데이트
        loadReviews(currentPage, currentSort);
        updateReviewStats();  // 통계 업데이트
        updateAvgRating();    // 평균 평점 업데이트
        updateReviewCount();  // 리뷰 수 업데이트

        // 평점 표시 부분도 업데이트
        $(".rating-value").text(result.avgRating.toFixed(1));
        $("span.display-4").text(result.avgRating.toFixed(1));

        showAlert('리뷰가 등록되었습니다.', 'success');
      },
      error: function (xhr) {
        if (xhr.status === 403) {
          showAlert("상품을 구매해야 리뷰를 작성할 수 있습니다.", 'warning');
        } else {
          showAlert('리뷰 등록에 실패했습니다.', 'error');
        }
      }
    });
  });

  // 리뷰 작성 버튼 클릭 이벤트
  $("#writeReviewBtn").off("click").on("click", function () {
    const bookId = $("#bookId").val();

    $.get(`/orders/check/${bookId}`)
      .done(function (response) {
        if (response.purchased) {
          const modal = new bootstrap.Modal(document.getElementById('reviewModal'));
          modal.show();
        } else {
          showAlert('상품을 구매해야 리뷰를 작성할 수 있습니다.', 'warning');
        }
      }).fail(function (xhr) {
        if (xhr.status === 401) {
          showAlert('로그인이 필요합니다.', 'info')
            .then((result) => {
              if (result.isConfirmed) {
                window.location.href = '/members/login';
              }
            });
        } else {
          showAlert('오류가 발생했습니다', 'error');
        }
      });
  });

  // 리뷰 모달창 닫을 때 리뷰 폼 초기화
  $("#reviewModal").on("hidden.bs.modal", function () {
    $("#reviewForm")[0].reset();
    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open').removeAttr('style');
  });

  // 총 가격 변수
  const price = parseInt($("#totalPrice").text().replace(/[^0-9]/g, ""));

  // 수량 변경 시 총 가격 업데이트
  $("#quantity").change(function () {
    const quantity = parseInt($(this).val());
    if (quantity < 1) {
      $(this).val(1);
      updateTotalPrice(1);
    } else {
      updateTotalPrice(quantity);
    }
  });

  // 수량 입력 시 총 가격 업데이트
  $("#quantity").on('input', function () {
    const quantity = parseInt($(this).val()) || 0;
    if (quantity < 1) {
      $(this).val(1);
      updateTotalPrice(1);
    } else {
      updateTotalPrice(quantity);
    }
  });

  // 총 가격 업데이트 함수
  function updateTotalPrice(quantity) {
    const totalPrice = price * quantity;
    $("#totalPrice").text(totalPrice.toLocaleString() + '원');
  }

  // 카카오톡 공유 버튼 기능 클릭 이벤트
  $("#shareKakaoBtn").off('click').on('click', function (e) {
    e.preventDefault();

    try {
      console.log("SDK 초기화 체크");

      if (!Kakao.isInitialized()) {
        Kakao.init('d3524ffef60bb1c59553b6a24dd4ef1d');
      }

      const bookTitle = $(".book-title").text().trim();
      const bookAuthor = $(".book-author").text().trim().replace("저자:", "").trim();
      const bookPrice = $(".book-price span:last").text().trim();
      const bookImage = $(".book-img img").attr("src");
      const currentUrl = window.location.href;

      console.log("공유 시작");

      Kakao.Share.sendDefault({
        objectType: 'commerce',
        content: {
          title: '',
          description: '',
          imageUrl: bookImage,
          link: {
            mobileWebUrl: currentUrl,
            webUrl: currentUrl
          }
        },
        commerce: {
          productName: `${bookTitle} / ${bookAuthor}`,
          regularPrice: parseInt(bookPrice.replace(/[^0-9]/g, "")),
        },
        buttonTitle: '구매하기',
      });
      console.log("카카오톡 공유 성공");
    } catch (error) {
      console.error('카카오톡 공유 실패 : ', error);
      showAlert('카카오톡 공유 실패', 'error');
    }
  });

  // 비로그인 상태 리뷰작성 버튼 대신에 뜨는 문구에 있는 로그인 버튼
  $('#loginBtn').click(function () {
    showAlert('로그인이 필요합니다', 'warning')
      .then((result) => {
        if (result.isConfirmed) {
          window.location.href = '/members/login';
        }
      });
  });

  // 찜하기 버튼 클클릭 이벤트
  $('#wishBtn').off('click').on('click', function () {
    const bookId = $('#bookId').val();
    console.log("찜!!");
    $.ajax({
      url: `/wish/${bookId}`,
      type: 'Post',
      success: function (response) {
        const $icon = $('#wishBtn i');
        if (response.isWished) {
          // 찜하지 않은 상태라면
          $icon.removeClass('far').addClass('fas');
          showAlert('찜 목록에 추가되었습니다.', 'success');
        } else {
          // 이미 찜한 상태라면
          $icon.removeClass('fas').addClass('far');
          showAlert('찜 목록에서 제거되었습니다.', 'success');
        }
      },
      error: function () {
        showAlert('오류가 발생했습니다.', 'error');
      }
    });
  });

  $("#reviewSort").change(function () {
    const sortType = $(this).val();
    loadReviews(0, sortType);
  });

  // 리뷰 작성 모달이 열릴 때 초기화
  $("#reviewModal").on("show.bs.modal", function () {
    // 폼 완전 초기화
    $("#reviewForm")[0].reset();
    $("#rating").val('5');
    $("#content").val('');
    $("#imagePreview").empty();
    $("#reviewImages").val('');
    // 태그 체크박스 초기화
    $("input[name='tagType']").prop('checked', false);
  });

  // 수정 모달이 열릴 때 초기화 (editReview 함수 내부)
  function editReview(reviewId) {
    // 기존 데이터 로드 전에 폼 초기화
    $("#editReviewForm")[0].reset();
    $("#editRating").val('5');
    $("#editContent").val('');
    $("#editImagePreview").empty();
    $("#editReviewImages").val('');
    // 태그 체크박스 초기화
    $("input[name='editTagType']").prop('checked', false);

    // 이후 리뷰 데이터 로드
    // ... 기존 코드 ...
  }

  // 각 모달이 닫� 때도 초기화
  $("#reviewModal, #editReviewModal").on("hidden.bs.modal", function () {
    const formId = $(this).find('form').attr('id');
    $(`#${formId}`)[0].reset();

    if (formId === 'reviewForm') {
      $("#rating").val('5');
      $("#content").val('');
      $("#imagePreview").empty();
      $("#reviewImages").val('');
      $("input[name='tagType']").prop('checked', false);
    } else {
      $("#editRating").val('5');
      $("#editContent").val('');
      $("#editImagePreview").empty();
      $("#editReviewImages").val('');
      $("input[name='editTagType']").prop('checked', false);
    }

    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open').removeAttr('style');
  });
});

// 리뷰 목목록 조회
function loadReviews(page = 0, sortType = 'likes') {
  // 시간 표시 형식 변환 함수
  function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) {
      return "방금 전";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`;
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else if (diffInHours < 7) {
      return `${diffInDays}일 전`;
    } else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  currentPage = page; // 현재 페이지 업데이트
  currentSort = sortType; // 현재 정렬 업데이트
  const bookId = $("#bookId").val();
  $.ajax({
    url: `/reviews/${bookId}?page=${page}&sort=${sortType}`,
    type: "Get",
    dataType: "json",
    success: function (response) {
      console.log("서버 응답 :", response);

      $("#reviewContainer").empty();
      updateReviewCount();
      updateReviewStats();

      response.content.forEach(function (review) {
        const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
        const timeAgo = formatTimeAgo(review.createdAt);

        // 좋아요 버튼
        const likeBtn = `
          <button id="like-${review.id}" class="btn btn-sm ${review.isLiked ? 'liked' : ''}"
                  onclick="toggleLike(${review.id})">
            <i class="fas fa-thumbs-up"></i>
            <span class="like-count" id="like-count-${review.id}">${review.likeCount || 0}</span>
          </button>
        `;

        // 신고 버튼
        const reportBtn = `
          <button id="report-${review.id}" class="btn btn-sm report-review"
                  data-review-id="${review.id}" style="color: #dc3545;"
                  onclick="reportReview(${review.id})">
            <i class="fas fa-flag"></i>
          </button>
        `;

        // 수정, 삭제 버튼(자기만 보이게)
        let editDeleteBtn = '';
        if (review.isOwner === true) {
          editDeleteBtn = `
          <div class="btn-group">
            <button class="btn btn-sm btn-primary edit-review me-1"
                          data-review-id="${review.id}"
                          data-rating="${review.rating}"
                          data-content="${review.content}"
                          data-tag-type="${review.tagType || ''}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-review"
                          data-review-id="${review.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>`;
        }

        // 이미지 부분
        let imagesHtml = '';
        if (review.images && review.images.length > 0) {
          imagesHtml = `
            <div class="review-images mt-2 d-flex gap-2 flex-wrap">
              ${review.images.map(img => `
                <img src="/bookshop/review/${img}" class="img-thumbnail review-image"
                style="width: 100px; height: 100px; object-fit: cover; cursor: pointer;"
                onclick="showImageModal(this.src)">
              `).join('')}
            </div>
          `;
        }

        // 태그 뱃지
        const tagBadge = review.tagType ?
          `<span class="badge rounded-pill bg-secondary ms-2"
         data-tag="${review.tagType}">${getTagLabel(review.tagType)}</span>` : '';

        // 리뷰 목록 html
        const reviewHtml = `
          <div class="review-item border-bottom py-3">
            <div class="d-flex justify-content-between align-items-start">
              <div class="d-flex align-items-center gap-2">
                <div class="rating text-warning">${stars}</div>
                <div class="reviewer">구매자 : ${review.memberName}</div>
              </div>
              <div class="d-flex align-items-center gap-2">
                ${tagBadge}
                <small class="text-muted">${timeAgo}</small>
                ${editDeleteBtn}
              </div>
            </div>
            ${imagesHtml}
            <div class="review-content mt-2">${review.content}</div>
            <div class="d-flex justify-content-end align-items-end mt-2">
              <div class="d-flex gap-2">
                ${likeBtn}
                ${reportBtn}
              </div>
            </div>
          </div>
        `;
        $("#reviewContainer").append(reviewHtml);
      });

      // 페이지 html
      let paginationHtml = '<div class="d-flex justify-content-center mt-4"><ul class="pagination">';

      if (!response.first) {
        paginationHtml += `<li class="page-item">
                              <a class="page-link" href="#" data-page="${response.number - 1}">이전</a>
                           </li>`;
      }

      for (let i = 0; i < response.totalPages; i++) {
        paginationHtml += `<li class="page-item ${response.number === i ? 'active' : ''}">
                              <a class="page-link" href="#" data-page="${i}">${i + 1}</a>
                           </li>`;
      }

      if (!response.last) {
        paginationHtml += `<li class="page-item">
                              <a class="page-link" href="#" data-page="${response.number + 1}">다음</a>
                           </li>`;
      }

      paginationHtml += '</ul></div>';
      $("#reviewContainer").append(paginationHtml);

      // 이벤트 바인딩 전에 기존 이벤트 제거
      $(".pagination .page-link").off("click");
      $(".edit-review").off("click");
      $(".delete-review").off("click");

      // 새로운 이벤트 바인딩
      $(".pagination .page-link").on("click", function (e) {
        e.preventDefault();
        const page = $(this).data("page");
        const sort = $("#reviewSort").val();
        loadReviews(page, sort);
      });

      // 수정 버튼 이벤트트
      $(".edit-review").on("click", function () {
        const reviewId = $(this).data("review-id");
        editReview(reviewId);
      });

      // 삭제 버튼 이벤트
      $(".delete-review").on("click", function () {
        const reviewId = $(this).data("review-id");
        deleteReview(reviewId);
      });
    },
    error: function () {
      showAlert('리뷰 목록을 불러오는데 실패했습니다.', 'error');
    }
  });

  function getTagLabel(tagType) {
    const labels = {
      'THANKS': '고마워요',
      'BEST': '최고예요',
      'EMPATHY': '공감돼요',
      'FUN': '재밌어요',
      'HEALING': '힐링돼요'
    };
    return labels[tagType] || tagType;
  }
}

// 리뷰 목록에 있는 이미지 누를 때 나오는 모발창
function showImageModal(src) {
  Swal.fire({
    imageUrl: src,
    imageWidth: 'auto',
    imageHeight: 'auto',
    showConfirmButton: false,
    showCloseButton: true,
    width: 'auto',
    padding: '1em',
    background: '#fff',
    customClass: {
      container: 'review-image-modal'
    }
  });
}

// 리뷰 수정 함수
function editReview(reviewId) {
  const rating = $(`.edit-review[data-review-id="${reviewId}"]`).data('rating');
  const content = $(`.edit-review[data-review-id="${reviewId}"]`).data('content');
  const tagType = $(`.edit-review[data-review-id="${reviewId}"]`).data('tag-type');

  console.log("수정 시작 - 리뷰 아이디 : ", reviewId);
  console.log("기존 데이터 - rating : ", rating, "content : ", content, "tagType : ", tagType);

  $('#editReviewId').val(reviewId);
  $('#editRating').val(rating);
  $('#editContent').val(content);

  if (tagType) {
    $(`#edit-tag-${tagType.toLowerCase()}`).prop('checked', true);
  }

  $('#editReviewModal').modal('show');

  // 이미지 변경 이벤트는 한 번만 바인딩
  $("#editReviewImages").off('change').on('change', function () {
    const preview = $('#editImagePreview');
    preview.empty();

    if (this.files.length > 3) {
      showAlert('이미지는 최대 3장까지 첨부할 수 있습니다.', 'warning');
      this.value = '';
      return;
    }

    Array.from(this.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = function (e) {
        preview.append(`
          <div class="position-relative d-inline-block me-2 mb-2">
            <img src="${e.target.result}" class="img-thumbnail"
                style="width: 100px; height: 100px; object-fit: cover;">
            <button type="button" class="btn-close position-absolute top-0 end-0 m-1"
                    style="background-color: white;"></button>
          </div>
        `);
      };
      reader.readAsDataURL(file);
    });
  });

  $(document).on('click', '#editImagePreview .btn-close', function () {
    $(this).parent().remove();
  });

  $('#editReviewForm').on('submit', function (e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('rating', $('#editRating').val());
    formData.append('content', $('#editContent').val());

    const checkedTag = $("input[name='editTagType']:checked").val();
    formData.append('tagType', checkedTag || '');

    const imageFiles = $('#editReviewImages')[0].files;
    Array.from(imageFiles).forEach(file => {
      formData.append('reviewImages', file);
    });

    console.log("전송할 데이터 : ", formData);

    $.ajax({
      url: `/reviews/${reviewId}`,
      type: 'Patch',
      data: formData,
      processData: false,
      contentType: false,
      success: function (result) {
        $('#editReviewModal').modal('hide');
        loadReviews(currentPage, currentSort);
        updateAvgRating();
        updateReviewCount();
        updateReviewStats();

        showAlert('리뷰가 수정되었습니다', 'success');
      },
      error: function (error) {
        console.log("수정 실패 ", error);
        showAlert('리뷰 수정에 실패했습니다.', 'error');
      }
    });
  });
}

// 수정 모달창이 닫힐 때 폼 초기화
$('#editReviewModal').on('hidden.bs.modal', function () {
  $('#editReviewForm')[0].reset();
  $('#editImagePreview').empty();
  $('.modal-backdrop').remove();
  $('body').removeClass('modal-open').removeAttr('style');
});

// 리뷰 삭제 함수
function deleteReview(reviewId) {
  Swal.fire({
    title: '리뷰를 삭제하시겠습니까?',
    text: '삭제된 리뷰는 복구할 수 없습니다.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: '삭제',
    cancelButtonText: '취소'
  }).then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        url: `/reviews/${reviewId}`,
        type: "Delete",
        success: function () {
          loadReviews(currentPage, currentSort);
          updateAvgRating();
          updateReviewCount();
          updateReviewStats();

          showAlert('삭제되었습니다', 'success');
        },
        error: function () {
          showAlert('리뷰 삭제에 실패했습니다', 'error');
        }
      });
    }
  });
}

// 평균 평점 업데이트
function updateAvgRating() {
  let bookId = $("#bookId").val();
  $.ajax({
    url: `/reviews/average/${bookId}`,
    type: "Get",
    success: function (avgRating) {
      $(".rating-value").text(avgRating.toFixed(1));
      $("span.display-4").text(avgRating.toFixed(1));
    }
  });
}

// 리뷰 총 개개수 업업데이트
function updateReviewCount() {
  let bookId = $("#bookId").val();
  $.ajax({
    url: `/reviews/count/${bookId}`,
    type: "Get",
    success: function (count) {
      $("#review-tab").text(`리뷰(${count})`);
    }
  });
}

// 리뷰 통계자료 업데이트
function updateReviewStats() {
  let bookId = $("#bookId").val();
  $.ajax({
    url: `/reviews/stats/${bookId}`,
    type: "Get",
    success: function (stats) {
      console.log("받은 통계 데이터:", stats);

      // 평점 통계 업데이트 (rating bars)
      Object.entries(stats.ratingStats).forEach(([rating, percentage]) => {
        $(`.rating-bars .rating-bar-item:nth-child(${6-rating}) .progress-bar`)
          .css('width', `${percentage}%`)
          .attr('aria-valuenow', percentage);
        $(`.rating-bars .rating-bar-item:nth-child(${6-rating}) .text-muted:last`)
          .text(`${percentage.toFixed(1)}%`);
      });

      // 태그 통계 업데이트 (vertical bars)
      const tagLabels = {
        'THANKS': '고마워요',
        'BEST': '최고예요',
        'EMPATHY': '공감돼요',
        'FUN': '재밌어요',
        'HEALING': '힐링돼요'
      };

      // 모든 태그 바를 먼저 0%로 초기화
      $(`.tag-distribution .tag-bar-item .progress-bar`).each(function() {
        $(this).css('height', '0%').attr('aria-valuenow', 0);
        $(this).closest('.tag-bar-item').find('.text-muted:last').text('0.0%');
      });

      // 태그 통계 적용
      Object.entries(stats.tagStats).forEach(([tag, percentage]) => {
        const tagLabel = tagLabels[tag];
        console.log(`태그 매치: ${tag} -> ${tagLabel}, 퍼센트: ${percentage}`);

        $(`.tag-distribution .tag-bar-item`).each(function() {
          const itemTagText = $(this).find('.text-muted:first').text().trim();
          if (itemTagText === tagLabel) {
            $(this).find('.progress-bar')
              .css('height', `${percentage}%`)
              .attr('aria-valuenow', percentage);
            $(this).find('.text-muted:last')
              .text(`${percentage.toFixed(1)}%`);
          }
        });
      });

      // 가장 많이 선택된 태그 업데이트
      if (stats.mostCommonTag) {
        const mostCommonTagLabel = tagLabels[stats.mostCommonTag] || stats.mostCommonTag;
        $('.most-common-tag h4').text(mostCommonTagLabel);
      } else {
        $('.most-common-tag h4').text('-'); // 태그가 없는 경우
      }

      console.log("통계 업데이트 완료");
    },
    error: function(xhr, status, error) {
      console.error("통계 업데이트 실패:", error);
    }
  });
}

// 알림창 함수
function showAlert(title, icon = '') {
  return Swal.fire({
    title: title,
    icon: icon,
    confirmButtonText: '확인'
  });
}
function order() {
  const bookId = document.getElementById('bookId').value;
  const quantity = document.getElementById('quantity').value;
  const price = parseInt($("#totalPrice").text().replace(/[^0-9]/g, ""));

  const paramData = {
    bookId: Number(bookId),
    count: parseInt(quantity),
    totalPrice: price
  }

  $.ajax({
    url: "/order/payment",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify(paramData),
    success: function (response) {
      location.href = '/order/payment';
    },
    error: function (jqXHR) {
      if (jqXHR.status == '401') {
        if (confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?')) {
          location.href = '/members/login';
        }
      } else {
        alert(jqXHR.responseText);
      }
    }
  });
}

function addCart() {
  // bookId 값을 hidden input에서 가져오기
  const bookId = document.getElementById('bookId').value;
  console.log("Raw bookId value:", bookId);

  const quantity = document.getElementById('quantity').value;
  console.log("Raw quantity value:", quantity);


  const url = "/cart";
  const paramData = {
    bookId: Number(bookId),
    count: parseInt(quantity)
  };

  console.log("전송할 데이터:", paramData);

  $.ajax({
    url: url,
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify(paramData),

    success: function (result, status) {
      alert("상품을 장바구니에 담았습니다.");
    },
    error: function (jqXHR, status, error) {
      console.log("에러 발생:", error);
      if (jqXHR.status == '401') {
        if (confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?')) {
          location.href = '/members/login';
        }
      } else {
        alert(jqXHR.responseText);
      }
    }
  });
}